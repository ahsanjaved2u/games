const mongoose = require('mongoose');

const gameScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  game: {
    type: String,
    required: true,
    index: true
  },
  // Reference to Contest document (competitive games)
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null,
  },
  // Reference to Session document (rewarding games)
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null,
  },
  // Deprecated: old string-based contest ID (kept for backward compat)
  contestId: {
    type: String,
    default: null,
  },
  contestStart: {
    type: Date,
    default: null,
  },
  contestEnd: {
    type: Date,
    default: null,
  },
  points: {
    type: Number,
    required: true,
    default: 0
  },
  time: {
    type: Number,
    required: true,
    default: 0
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  periodStart: {
    type: Date,
    default: null,
  },
  totalPlays: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// New contest-based leaderboard queries
gameScoreSchema.index({ game: 1, contest: 1, score: -1 });
gameScoreSchema.index({ user: 1, game: 1, contest: 1 });
// Session-based leaderboard queries
gameScoreSchema.index({ game: 1, session: 1, periodStart: 1, score: -1 });
gameScoreSchema.index({ user: 1, game: 1, session: 1, periodStart: 1 });
// Legacy indexes (kept for old data queries)
gameScoreSchema.index({ game: 1, contestId: 1, score: -1 });
gameScoreSchema.index({ user: 1, game: 1, contestId: 1 });

module.exports = mongoose.model('GameScore', gameScoreSchema);
