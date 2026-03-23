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
  periodStart: {
    type: Date,
    required: true,
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

// One entry per user per game per period — prevents double payment
gameEntrySchema.index({ user: 1, game: 1, periodStart: 1 }, { unique: true });

module.exports = mongoose.model('GameEntry', gameEntrySchema);
