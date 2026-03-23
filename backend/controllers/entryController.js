const Game = require('../models/Game');
const GameEntry = require('../models/GameEntry');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// Helper: compute the period start for entry-fee lookup.
// Rewarding  → global epoch-aligned period start
// Competitive → scheduleStart of the active contest
const getEntryPeriodStart = (game) => {
  if (game.gameType === 'competitive') {
    return game.scheduleStart ? new Date(game.scheduleStart) : null;
  }
  // Rewarding
  const periodMs = ((game.rewardPeriodDays || 0) * 86400000)
                 + ((game.rewardPeriodHours || 0) * 3600000)
                 + ((game.rewardPeriodMinutes || 0) * 60000);
  if (periodMs <= 0) return null;
  const anchor = game.periodAnchor ? new Date(game.periodAnchor).getTime() : 0;
  const elapsed = Date.now() - anchor;
  return new Date(anchor + Math.floor(elapsed / periodMs) * periodMs);
};

// ────────────────────────────────────────
// @desc    Check if user has paid entry for the current period
// @route   GET /api/entries/:slug/status
// @access  Private
// ────────────────────────────────────────
const checkEntry = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    // No entry fee → always allowed
    if (!game.entryFee || game.entryFee <= 0) {
      return res.json({ hasPaid: true, entryFee: 0 });
    }

    const periodStart = getEntryPeriodStart(game);
    if (!periodStart) return res.json({ hasPaid: true, entryFee: 0 });

    const entry = await GameEntry.findOne({
      user: req.user._id,
      game: game._id,
      periodStart,
    });

    // Also return wallet balance so frontend can make UI decisions
    const wallet = await Wallet.findOne({ user: req.user._id });

    res.json({
      hasPaid: !!entry,
      entryFee: game.entryFee,
      walletBalance: wallet ? wallet.balance : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Pay entry fee for the current period
// @route   POST /api/entries/:slug/pay
// @access  Private
// ────────────────────────────────────────
const payEntry = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (!game.entryFee || game.entryFee <= 0) {
      return res.json({ success: true, message: 'No entry fee required' });
    }

    const periodStart = getEntryPeriodStart(game);
    if (!periodStart) {
      return res.status(400).json({ message: 'Game has no active period or schedule configured' });
    }

    // Check if already paid
    const existing = await GameEntry.findOne({
      user: req.user._id,
      game: game._id,
      periodStart,
    });
    if (existing) {
      return res.json({ success: true, message: 'Already entered' });
    }

    // Check wallet balance
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id, balance: 0 });

    if (wallet.balance < game.entryFee) {
      return res.status(400).json({
        message: 'Insufficient balance',
        required: game.entryFee,
        walletBalance: wallet.balance,
      });
    }

    // Deduct entry fee
    wallet.balance -= game.entryFee;
    await wallet.save();

    // Create entry record
    await GameEntry.create({
      user: req.user._id,
      game: game._id,
      periodStart,
      amountPaid: game.entryFee,
    });

    // Log as transaction
    await Transaction.create({
      user: req.user._id,
      type: 'debit',
      amount: game.entryFee,
      description: `Entry fee — ${game.name}`,
      game: game.name,
      status: 'completed',
    });

    res.json({
      success: true,
      message: 'Entry paid',
      balance: wallet.balance,
    });
  } catch (error) {
    // Handle duplicate key (race condition — user double-clicked)
    if (error.code === 11000) {
      return res.json({ success: true, message: 'Already entered' });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = { checkEntry, payEntry, payAttempt };

// ────────────────────────────────────────
// @desc    Pay per-attempt cost (paid rewarding games)
// @route   POST /api/entries/:slug/pay-attempt
// @access  Private
// ────────────────────────────────────────
async function payAttempt(req, res) {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (!game.attemptCost || game.attemptCost <= 0) {
      return res.json({ success: true, message: 'No attempt cost' });
    }

    // Check wallet balance
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id, balance: 0 });

    if (wallet.balance < game.attemptCost) {
      return res.status(400).json({
        message: 'Insufficient balance',
        required: game.attemptCost,
        walletBalance: wallet.balance,
      });
    }

    // Deduct attempt cost
    wallet.balance -= game.attemptCost;
    await wallet.save();

    // Log as transaction
    await Transaction.create({
      user: req.user._id,
      type: 'debit',
      amount: game.attemptCost,
      description: `Game attempt — ${game.name}`,
      game: game.name,
      status: 'completed',
    });

    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
