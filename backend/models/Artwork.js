const mongoose = require('mongoose');

const ArtworkSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  artist: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  year: { 
    type: String, 
    required: true 
  },
  medium: { 
    type: String, 
    required: true 
  },
  dimensions: { 
    type: String, 
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  qrCodeUrl: { 
    type: String, 
    required: true 
  },
  cloudinaryId: { 
    type: String 
  },
  createdBy: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Artwork', ArtworkSchema);