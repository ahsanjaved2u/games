const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Game name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  thumbnail: {
    type: String,
    default: '',
  },
  isLive: {
    type: Boolean,
    default: false,
  },
  gamePath: {
    type: String,
    required: [true, 'Game path is required'],
  },
}, {
  timestamps: true,
});

gameSchema.index({ isLive: 1 });

module.exports = mongoose.model('Game', gameSchema);
