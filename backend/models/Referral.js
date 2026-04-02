const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
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
    unique: true, // a user can only be referred once
    index: true,
  },
  referrerIP: {
    type: String,
    default: null,
  },
  refereeIP: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'flagged', 'expired', 'rejected'],
    default: 'pending',
    index: true,
  },
  flagReason: {
    type: String,
    default: null,
  },
  activatedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  totalEarned: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index for fast look-ups
referralSchema.index({ referee: 1, status: 1 });
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ expiresAt: 1, status: 1 });

module.exports = mongoose.model('Referral', referralSchema);
