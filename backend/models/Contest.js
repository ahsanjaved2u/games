const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  name: {
    type: String,
    default: '',
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'distributed', 'cancelled'],
    default: 'scheduled',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  entryFee: {
    type: Number,
    default: 0,
    min: [0, 'Entry fee cannot be negative'],
  },
  prizes: {
    type: [Number],
    default: [],
  },
  minPlayersThreshold: {
    type: Number,
    default: 0,
    min: [0, 'Threshold cannot be negative'],
  },
  prizesDistributed: {
    type: Boolean,
    default: false,
  },
  hasTimeLimit: {
    type: Boolean,
    default: false,
  },
  timeLimitSeconds: {
    type: Number,
    default: 0,
    min: [0, 'Time limit cannot be negative'],
  },
  color: {
    type: String,
    default: '#00e5ff',
  },
  tag: {
    type: String,
    default: '',
  },
  instructions: [{
    icon: { type: String, default: '🎮' },
    title: { type: String, default: '' },
    text: { type: String, default: '' },
  }],
}, {
  timestamps: true,
});

// Find active/scheduled contests for a game
contestSchema.index({ game: 1, status: 1 });
// Cron: find contests by status + endDate
contestSchema.index({ status: 1, endDate: 1 });
// List contests for a game in chronological order
contestSchema.index({ game: 1, startDate: -1 });

module.exports = mongoose.model('Contest', contestSchema);
