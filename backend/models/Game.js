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
    type: String, // relative path within game folder, e.g. "images/background.png"
    default: '',
  },
  isFree: {
    type: Boolean,
    default: true,
  },
  price: {
    type: Number, // in PKR
    default: 0,
    min: [0, 'Price cannot be negative'],
  },
  isLive: {
    type: Boolean,
    default: false,
  },
  scheduleStart: {
    type: Date,
    default: null,
  },
  scheduleEnd: {
    type: Date,
    default: null,
  },
  showSchedule: {
    type: Boolean,
    default: false,
  },
  // Folder name inside the games directory (e.g. "bubble-shooter")
  // Full URL built as: GAMES_BASE_URL + "/" + gamePath + "/index.html"
  gamePath: {
    type: String,
    required: [true, 'Game path is required'],
  },
  // Instructions shown before game starts
  instructions: [{
    icon: { type: String, default: '🎮' },
    title: { type: String, default: '' },
    text: { type: String, default: '' },
  }],
  // Display metadata
  tag: {
    type: String, // e.g. "Popular", "New", "Hot"
    default: '',
  },
  color: {
    type: String, // accent color, e.g. "#00e5ff"
    default: '#00e5ff',
  },
  gameType: {
    type: String,
    enum: ['rewarding', 'competitive'],
    default: 'rewarding',
  },
  conversionRate: {
    type: Number, // score-to-currency rate, e.g. 10 means 10 score = 1 PKR
    default: 0,
    min: [0, 'Conversion rate cannot be negative'],
  },
  showCurrency: {
    type: Boolean,
    default: false,
  },
  prizes: {
    type: [Number], // e.g. [500, 300, 100] in PKR
    default: [],
  },
  // Competitive game payout tracking
  prizesDistributed: {
    type: Boolean,
    default: false,
  },
  minPlayersThreshold: {
    type: Number, // 0 = disabled; if > 0, prizes only pay out when at least this many players competed
    default: 0,
    min: [0, 'Threshold cannot be negative'],
  },
  // Unique identifier for the current contest round.
  // Auto-set to "scheduleStart_scheduleEnd" whenever the schedule changes,
  // ensuring each new round gets a distinct ID even if admin reuses dates.
  activeContestId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for quick lookups (slug already indexed via unique:true)
gameSchema.index({ isLive: 1 });

module.exports = mongoose.model('Game', gameSchema);
