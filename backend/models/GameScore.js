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
  points: {
    type: Number,
    required: true,
    default: 0
  },
  time: {
    type: Number, // seconds played
    required: true,
    default: 0
  },
  score: {
    type: Number, // calculated score
    required: true,
    default: 0
  },
  totalPlays: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Fast leaderboard queries
gameScoreSchema.index({ game: 1, score: -1 });
// Fast user-specific queries
gameScoreSchema.index({ user: 1, game: 1 });

module.exports = mongoose.model('GameScore', gameScoreSchema);
