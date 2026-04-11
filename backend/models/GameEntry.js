const mongoose = require('mongoose');

const gameEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  // For competitive games — links to the Contest document
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null,
  },
  // For rewarding games — links to the Session document
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null,
  },
  // For rewarding games — the period start timestamp
  periodStart: {
    type: Date,
    default: null,
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0,
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// One entry per user per game per contest (competitive)
gameEntrySchema.index({ user: 1, game: 1, contest: 1 }, { unique: true, sparse: true });
// One entry per user per game per period (rewarding)
gameEntrySchema.index({ user: 1, game: 1, periodStart: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('GameEntry', gameEntrySchema);
