const mongoose = require('mongoose');

const sessionPeriodSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  game: {
    type: String,
    required: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  rewardsDistributed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// One period per session per start time
sessionPeriodSchema.index({ session: 1, periodStart: 1 }, { unique: true });
// Query by game slug
sessionPeriodSchema.index({ game: 1, periodStart: -1 });

module.exports = mongoose.model('SessionPeriod', sessionPeriodSchema);
