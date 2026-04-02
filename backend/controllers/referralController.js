const Referral = require('../models/Referral');
const ReferralEarning = require('../models/ReferralEarning');
const User = require('../models/User');
const AppSettings = require('../models/AppSettings');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// ── Helper: get or create wallet ──
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });
  return wallet;
};

// ────────────────────────────────────────
// @desc    Get my referral dashboard (for user A — the referrer)
// @route   GET /api/referrals/my
// @access  Private
// ────────────────────────────────────────
const getMyReferrals = async (req, res) => {
  try {
    // Auto-generate referral code for existing users — use updateOne to avoid validation issues
    let user = await User.findById(req.user._id).select('referralCode');
    if (!user.referralCode) {
      const crypto = require('crypto');
      const newCode = 'GV-' + crypto.randomBytes(4).toString('hex');
      await User.updateOne({ _id: req.user._id }, { $set: { referralCode: newCode } });
      user = await User.findById(req.user._id).select('referralCode');
    }

    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referee', 'name email createdAt')
      .sort({ createdAt: -1 });

    const [settings, totalEarningsAgg] = await Promise.all([
      Promise.all([
        AppSettings.getSetting('referralBonusPercent', 10),
        AppSettings.getSetting('referralDurationDays', 30),
        AppSettings.getSetting('maxReferralsPerUser', 50),
      ]),
      ReferralEarning.aggregate([
        { $match: { referrer: req.user._id } },
        { $group: { _id: null, total: { $sum: '$bonusAmount' } } },
      ]),
    ]);

    const now = new Date();
    const formatted = referrals.map(r => ({
      _id: r._id,
      referee: r.referee ? { name: r.referee.name, email: r.referee.email, joinedAt: r.referee.createdAt } : null,
      status: r.status,
      activatedAt: r.activatedAt,
      expiresAt: r.expiresAt,
      daysRemaining: r.expiresAt && r.status === 'active'
        ? Math.max(0, Math.ceil((new Date(r.expiresAt) - now) / 86400000))
        : 0,
      totalEarned: r.totalEarned,
      createdAt: r.createdAt,
    }));

    res.json({
      success: true,
      referralCode: user.referralCode,
      bonusPercent: Number(settings[0]),
      durationDays: Number(settings[1]),
      maxReferrals: Number(settings[2]),
      totalEarnings: totalEarningsAgg[0]?.total || 0,
      activeCount: referrals.filter(r => r.status === 'active').length,
      totalCount: referrals.length,
      referrals: formatted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get my referral earnings breakdown
// @route   GET /api/referrals/my/earnings
// @access  Private
// ────────────────────────────────────────
const getMyReferralEarnings = async (req, res) => {
  try {
    const earnings = await ReferralEarning.find({ referrer: req.user._id })
      .populate('referee', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, earnings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: get all referrals with IPs
// @route   GET /api/referrals/admin/all
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetAllReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate('referrer', 'name email')
      .populate('referee', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, referrals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: update referral status (approve/reject flagged)
// @route   PATCH /api/referrals/admin/:id/status
// @access  Private/Admin
// ────────────────────────────────────────
const adminUpdateReferralStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'rejected', 'flagged'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use active, rejected, or flagged.' });
    }

    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ message: 'Referral not found' });

    referral.status = status;

    // If approving a flagged referral, set activation & expiry
    if (status === 'active' && !referral.activatedAt) {
      const durationDays = Number(await AppSettings.getSetting('referralDurationDays', 30));
      referral.activatedAt = new Date();
      referral.expiresAt = new Date(Date.now() + durationDays * 86400000);
    }

    await referral.save();
    res.json({ success: true, referral });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: get referral stats summary
// @route   GET /api/referrals/admin/stats
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetReferralStats = async (req, res) => {
  try {
    const [total, active, flagged, pending, totalEarnings] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'active' }),
      Referral.countDocuments({ status: 'flagged' }),
      Referral.countDocuments({ status: 'pending' }),
      ReferralEarning.aggregate([
        { $group: { _id: null, total: { $sum: '$bonusAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        active,
        flagged,
        pending,
        totalBonusPaid: totalEarnings[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Credit referral bonus when referee earns a reward
//          Called internally from scoreController
// @access  Internal
// ────────────────────────────────────────
const creditReferralBonus = async (refereeUserId, gameLabel, baseRewardAmount) => {
  try {
    // Find active, non-expired referral for this referee
    const referral = await Referral.findOne({
      referee: refereeUserId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

    if (!referral) return null;

    const bonusPercent = Number(await AppSettings.getSetting('referralBonusPercent', 10));
    if (bonusPercent <= 0) return null;

    const bonusAmount = parseFloat(((baseRewardAmount * bonusPercent) / 100).toFixed(2));
    if (bonusAmount <= 0) return null;

    // Credit referrer's wallet
    const wallet = await getOrCreateWallet(referral.referrer);
    wallet.balance = parseFloat((wallet.balance + bonusAmount).toFixed(2));
    await wallet.save();

    // Create transaction
    await Transaction.create({
      user: referral.referrer,
      type: 'credit',
      amount: bonusAmount,
      description: 'Referral bonus',
      game: gameLabel,
      status: 'completed',
    });

    // Log the earning
    await ReferralEarning.create({
      referral: referral._id,
      referrer: referral.referrer,
      referee: refereeUserId,
      game: gameLabel,
      baseReward: baseRewardAmount,
      bonusPercent,
      bonusAmount,
    });

    // Update running total on referral
    referral.totalEarned = parseFloat((referral.totalEarned + bonusAmount).toFixed(2));
    await referral.save();

    return { bonusAmount, referrer: referral.referrer };
  } catch (err) {
    console.error('[referral-bonus]', err.message);
    return null;
  }
};

module.exports = {
  getMyReferrals,
  getMyReferralEarnings,
  adminGetAllReferrals,
  adminUpdateReferralStatus,
  adminGetReferralStats,
  creditReferralBonus,
};
