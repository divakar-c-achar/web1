require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Import models
const User = require('./models/User');
const Artwork = require('./models/Artwork');
const Engagement = require('./models/Engagement');
const Session = require('./models/Session');

const app = express();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'museum-artworks',
    format: async (req, file) => 'png',
    public_id: (req, file) => {
      return `artwork-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    },
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Helper Functions
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

function generateSessionId(req) {
  const ip = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = Date.now();
  return crypto.createHash('md5').update(ip + userAgent + timestamp).digest('hex');
}

// Session Middleware
app.use(async (req, res, next) => {
  try {
    let sessionId = req.headers['x-session-id'] || generateSessionId(req);
    
    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = new Session({
        sessionId,
        userAgent: req.get('User-Agent'),
        ipAddress: getClientIP(req)
      });
      await session.save();
    } else {
      session.lastSeen = new Date();
      await session.save();
    }
    
    req.sessionId = sessionId;
    res.setHeader('X-Session-ID', sessionId);
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    next();
  }
});

// Initialize Default Users
async function initializeDefaultUsers() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const adminUser = new User({
        username: 'admin',
        password: await bcrypt.hash('museum123', 10),
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Admin user created: admin / museum123');
    }

    const staffExists = await User.findOne({ username: 'staff' });
    if (!staffExists) {
      const staffUser = new User({
        username: 'staff',
        password: await bcrypt.hash('staff123', 10),
        role: 'staff'
      });
      await staffUser.save();
      console.log('✅ Staff user created: staff / staff123');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
}

// QR Code Generation
async function generateQRCode(artworkId) {
  try {
    const qrCodeData = `${process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`}/artwork.html?id=${artworkId}`;
    
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
      color: { dark: '#000000', light: '#FFFFFF' },
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H'
    });

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'museum-qr-codes',
          public_id: `qr-${artworkId}`,
          resource_type: 'image'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(qrCodeBuffer);
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Routes

// Serve Main Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/scanner', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/scanner.html'));
});

app.get('/artwork', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/artwork.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/analytics.html'));
});

// Auth Routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Engagement Tracking Routes
app.post('/api/engagement/start', async (req, res) => {
  try {
    const { artworkId, pageType = 'scanner' } = req.body;
    
    if (!artworkId) {
      return res.status(400).json({ message: 'Artwork ID is required' });
    }

    const artwork = await Artwork.findOne({ id: artworkId });
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const engagement = new Engagement({
      artworkId,
      sessionId: req.sessionId,
      startTime: new Date(),
      userAgent: req.get('User-Agent'),
      ipAddress: getClientIP(req),
      pageType
    });

    await engagement.save();

    await Session.findOneAndUpdate(
      { sessionId: req.sessionId },
      { $inc: { totalArtworksViewed: 1 } }
    );

    res.json({ 
      success: true, 
      engagementId: engagement._id,
      sessionId: req.sessionId 
    });
  } catch (error) {
    console.error('Error starting engagement tracking:', error);
    res.status(500).json({ message: 'Error starting engagement tracking' });
  }
});

app.post('/api/engagement/end', async (req, res) => {
  try {
    const { engagementId } = req.body;
    
    if (!engagementId) {
      return res.status(400).json({ message: 'Engagement ID is required' });
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) {
      return res.status(404).json({ message: 'Engagement record not found' });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - engagement.startTime) / 1000);

    engagement.endTime = endTime;
    engagement.duration = duration;
    await engagement.save();

    await Session.findOneAndUpdate(
      { sessionId: engagement.sessionId },
      { $inc: { totalTimeSpent: duration } }
    );

    res.json({ 
      success: true, 
      duration,
      sessionId: engagement.sessionId 
    });
  } catch (error) {
    console.error('Error ending engagement tracking:', error);
    res.status(500).json({ message: 'Error ending engagement tracking' });
  }
});

// Public API Routes
app.get('/api/artworks', async (req, res) => {
  try {
    const artworks = await Artwork.find().sort({ createdAt: -1 });
    res.json(artworks);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    res.status(500).json({ message: 'Error fetching artworks' });
  }
});

app.get('/api/artworks/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findOne({ id: req.params.id });
    
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }
    
    res.json(artwork);
  } catch (error) {
    console.error('Error fetching artwork:', error);
    res.status(500).json({ message: 'Error fetching artwork' });
  }
});

// Protected Admin Routes
app.get('/api/admin/artworks', authenticateToken, async (req, res) => {
  try {
    const artworks = await Artwork.find().sort({ createdAt: -1 });
    res.json(artworks);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    res.status(500).json({ message: 'Error fetching artworks' });
  }
});

app.post('/api/admin/artworks', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, artist, description, year, medium, dimensions } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const id = uuidv4();
    const qrCodeUrl = await generateQRCode(id);

    const artwork = new Artwork({
      id,
      title,
      artist,
      description,
      year,
      medium,
      dimensions,
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename,
      qrCodeUrl,
      createdBy: req.user.username
    });

    await artwork.save();
    res.status(201).json(artwork);
    
  } catch (error) {
    console.error('Error creating artwork:', error);
    
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cleanupError) {
        console.error('Error cleaning up image:', cleanupError);
      }
    }
    
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/admin/artworks/:id', authenticateToken, async (req, res) => {
  try {
    const artwork = await Artwork.findOne({ id: req.params.id });
    
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    if (artwork.cloudinaryId) {
      await cloudinary.uploader.destroy(artwork.cloudinaryId);
    }

    await cloudinary.uploader.destroy(`museum-qr-codes/qr-${req.params.id}`);
    await Artwork.deleteOne({ id: req.params.id });
    await Engagement.deleteMany({ artworkId: req.params.id });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ message: 'Error deleting artwork' });
  }
});

app.get('/api/admin/download-qr/:artworkId', authenticateToken, async (req, res) => {
  try {
    const { artworkId } = req.params;
    const artwork = await Artwork.findOne({ id: artworkId });
    
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    res.redirect(artwork.qrCodeUrl);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    res.status(500).json({ message: 'Error downloading QR code' });
  }
});

// Analytics Routes (Admin Only)
app.get('/api/admin/engagement-analytics', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '24h':
        dateFilter = { startTime: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { startTime: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { startTime: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const totalEngagements = await Engagement.countDocuments(dateFilter);
    const completedEngagements = await Engagement.countDocuments({
      ...dateFilter,
      duration: { $exists: true }
    });
    
    const averageDuration = await Engagement.aggregate([
      { $match: { ...dateFilter, duration: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    const topArtworks = await Engagement.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$artworkId',
          totalViews: { $sum: 1 },
          completedViews: { 
            $sum: { $cond: [{ $ifNull: ['$duration', false] }, 1, 0] } 
          },
          avgDuration: { $avg: '$duration' },
          totalTimeSpent: { $sum: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'artworks',
          localField: '_id',
          foreignField: 'id',
          as: 'artwork'
        }
      },
      { $unwind: '$artwork' },
      {
        $project: {
          artworkId: '$_id',
          artworkTitle: '$artwork.title',
          artworkArtist: '$artwork.artist',
          totalViews: 1,
          completedViews: 1,
          avgDuration: { $round: ['$avgDuration', 2] },
          totalTimeSpent: 1
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 20 }
    ]);

    const engagementOverTime = await Engagement.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
          },
          views: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const sessionStats = await Session.aggregate([
      { $match: { lastSeen: { $gte: dateFilter.startTime.$gte } } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgArtworksPerSession: { $avg: '$totalArtworksViewed' },
          avgTimePerSession: { $avg: '$totalTimeSpent' }
        }
      }
    ]);

    res.json({
      timeframe,
      summary: {
        totalEngagements,
        completedEngagements,
        completionRate: totalEngagements > 0 ? (completedEngagements / totalEngagements * 100).toFixed(2) : 0,
        averageDuration: averageDuration[0]?.avgDuration ? Math.round(averageDuration[0].avgDuration) : 0
      },
      topArtworks,
      engagementOverTime,
      sessionStats: sessionStats[0] || {
        totalSessions: 0,
        avgArtworksPerSession: 0,
        avgTimePerSession: 0
      }
    });

  } catch (error) {
    console.error('Error fetching engagement analytics:', error);
    res.status(500).json({ message: 'Error fetching engagement analytics' });
  }
});

app.get('/api/admin/engagement/:artworkId', authenticateToken, async (req, res) => {
  try {
    const { artworkId } = req.params;
    const { timeframe = '7d' } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '24h':
        dateFilter = { startTime: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { startTime: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { startTime: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const artworkEngagement = await Engagement.aggregate([
      { 
        $match: { 
          artworkId,
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$artworkId',
          totalViews: { $sum: 1 },
          completedViews: { 
            $sum: { $cond: [{ $ifNull: ['$duration', false] }, 1, 0] } 
          },
          avgDuration: { $avg: '$duration' },
          maxDuration: { $max: '$duration' },
          minDuration: { $min: '$duration' },
          totalTimeSpent: { $sum: '$duration' }
        }
      }
    ]);

    const recentEngagements = await Engagement.find({
      artworkId,
      ...dateFilter
    })
    .sort({ startTime: -1 })
    .limit(50);

    const artwork = await Artwork.findOne({ id: artworkId });

    res.json({
      artwork: {
        id: artwork?.id,
        title: artwork?.title,
        artist: artwork?.artist
      },
      engagement: artworkEngagement[0] || {
        totalViews: 0,
        completedViews: 0,
        avgDuration: 0,
        totalTimeSpent: 0
      },
      recentEngagements: recentEngagements.map(eng => ({
        startTime: eng.startTime,
        duration: eng.duration,
        sessionId: eng.sessionId,
        pageType: eng.pageType
      }))
    });

  } catch (error) {
    console.error('Error fetching artwork engagement:', error);
    res.status(500).json({ message: 'Error fetching artwork engagement' });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Error Handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start Server
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB Atlas');

    await initializeDefaultUsers();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🏠 Frontend: http://localhost:${PORT}`);
      console.log(`🔐 Admin Login: http://localhost:${PORT}/login`);
      console.log(`📱 Scanner: http://localhost:${PORT}/scanner`);
      console.log(`📊 Analytics: http://localhost:${PORT}/analytics`);
      console.log(`💾 Database: MongoDB Atlas (Cloud)`);
      console.log(`🖼️  Image Storage: Cloudinary (Cloud)`);
      console.log('⏱️  Engagement Tracking: Enabled');
      console.log('\n📋 Default Login Credentials:');
      console.log('   Admin - Username: admin, Password: museum123');
      console.log('   Staff - Username: staff, Password: staff123');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();