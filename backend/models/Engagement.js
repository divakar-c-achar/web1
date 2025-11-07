const mongoose = require('mongoose');

const EngagementSchema = new mongoose.Schema({
  artworkId: { 
    type: String, 
    required: true 
  },
  sessionId: { 
    type: String, 
    required: true 
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date 
  },
  duration: { 
    type: Number 
  },
  userAgent: { 
    type: String 
  },
  ipAddress: { 
    type: String 
  },
  pageType: { 
    type: String, 
    enum: ['scanner', 'artwork'], 
    default: 'scanner' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Engagement', EngagementSchema);