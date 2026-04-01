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
  hasTimeLimit: {
    type: Boolean,
    default: false,
  },
  timeLimitSeconds: {
    type: Number, // game duration in seconds (e.g. 600 = 10 minutes)
    default: 0,
    min: [0, 'Time limit cannot be negative'],
  },
  // When admin manually unpublishes, this prevents auto-publish from overriding.
  // Cleared when a new schedule starts or admin re-publishes.
  manualUnpublish: {
    type: Boolean,
    default: false,
  },
  // Unique identifier for the current contest round.
  // Auto-set to "scheduleStart_scheduleEnd" whenever the schedule changes,
  // ensuring each new round gets a distinct ID even if admin reuses dates.
  activeContestId: {
    type: String,
    default: null,
  },
  // Reward period for rewarding games — after this duration, a new leaderboard entry + transaction is created
  rewardPeriodDays: {
    type: Number,
    default: 0,
    min: [0, 'Days cannot be negative'],
  },
  rewardPeriodHours: {
    type: Number,
    default: 0,
    min: [0, 'Hours cannot be negative'],
  },
  rewardPeriodMinutes: {
    type: Number,
    default: 0,
    min: [0, 'Minutes cannot be negative'],
  },
  // Anchor timestamp for period alignment — periods cycle from this point
  // Set when game is created or when period values change
  periodAnchor: {
    type: Date,
    default: null,
  },
  // Entry fee per reward period / contest (0 = free entry)
  entryFee: {
    type: Number,
    default: 0,
    min: [0, 'Entry fee cannot be negative'],
  },
  // Per-attempt cost for paid rewarding games (0 = free attempts)
  attemptCost: {
    type: Number,
    default: 0,
    min: [0, 'Attempt cost cannot be negative'],
  },
}, {
  timestamps: true,
});

// Index for quick lookups (slug already indexed via unique:true)
gameSchema.index({ isLive: 1 });
gameSchema.index({ gameType: 1, isLive: 1, scheduleStart: 1, scheduleEnd: 1 });

module.exports = mongoose.model('Game', gameSchema);
