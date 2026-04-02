const mongoose = require('mongoose');

const referralEarningSchema = new mongoose.Schema({
  referral: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    required: true,
    index: true,
  },
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  game: {
    type: String,
    required: true,
  },
  baseReward: {
    type: Number,
    required: true,
  },
  bonusPercent: {
    type: Number,
    required: true,
  },
  bonusAmount: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

referralEarningSchema.index({ referrer: 1, createdAt: -1 });

module.exports = mongoose.model('ReferralEarning', referralEarningSchema);
