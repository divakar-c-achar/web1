const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userAgent: { 
    type: String 
  },
  ipAddress: { 
    type: String 
  },
  firstSeen: { 
    type: Date, 
    default: Date.now 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  totalArtworksViewed: { 
    type: Number, 
    default: 0 
  },
  totalTimeSpent: { 
    type: Number, 
    default: 0 
  }
});

module.exports = mongoose.model('Session', SessionSchema);