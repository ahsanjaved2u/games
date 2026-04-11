const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
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
  isActive: {
    type: Boolean,
    default: true,
  },
  pause: {
    type: Boolean,
    default: false,
  },
  ended: {
    type: Boolean,
    default: false,
  },
  // ── Recurrence duration ──
  durationDays: {
    type: Number,
    default: 0,
    min: [0, 'Days cannot be negative'],
  },
  durationHours: {
    type: Number,
    default: 0,
    min: [0, 'Hours cannot be negative'],
  },
  durationMinutes: {
    type: Number,
    default: 0,
    min: [0, 'Minutes cannot be negative'],
  },
  periodAnchor: {
    type: Date,
    default: Date.now,
  },
  // ── Reward settings ──
  conversionRate: {
    type: Number,
    default: 0,
    min: [0, 'Conversion rate cannot be negative'],
  },
  showCurrency: {
    type: Boolean,
    default: false,
  },
  // ── Pricing ──
  entryFee: {
    type: Number,
    default: 0,
    min: [0, 'Entry fee cannot be negative'],
  },
  attemptCost: {
    type: Number,
    default: 0,
    min: [0, 'Attempt cost cannot be negative'],
  },
  // ── Game duration per play ──
  hasTimeLimit: {
    type: Boolean,
    default: false,
  },
  timeLimitSeconds: {
    type: Number,
    default: 0,
    min: [0, 'Time limit cannot be negative'],
  },
  // ── Display ──
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

sessionSchema.index({ game: 1, isActive: 1 });
sessionSchema.index({ game: 1, createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
