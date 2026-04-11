const Game = require('../models/Game');
const Contest = require('../models/Contest');
const Session = require('../models/Session');
const GameEntry = require('../models/GameEntry');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { getSessionPeriod } = require('./sessionController');

// ────────────────────────────────────────
// @desc    Check if user has paid entry for the current period/contest/session
// @route   GET /api/entries/:slug/status
// @access  Private
// ────────────────────────────────────────
const checkEntry = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const { contestId, sessionId } = req.query;
    let entryFee = 0;
    let entry = null;

    if (contestId) {
      const contest = await Contest.findById(contestId);
      entryFee = contest?.entryFee || 0;
      if (entryFee > 0 && contest) {
        entry = await GameEntry.findOne({ user: req.user._id, game: game._id, contest: contest._id });
      }
    } else if (sessionId) {
      const sessionDoc = await Session.findById(sessionId);
      entryFee = sessionDoc?.entryFee || 0;
      if (entryFee > 0 && sessionDoc) {
        const period = getSessionPeriod(sessionDoc);
        if (period) {
          entry = await GameEntry.findOne({ user: req.user._id, game: game._id, session: sessionDoc._id, periodStart: period.start });
        }
      }
    }

    if (entryFee <= 0) {
      return res.json({ hasPaid: true, entryFee: 0 });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });

    res.json({
      hasPaid: !!entry,
      entryFee,
      walletBalance: wallet ? wallet.balance : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Pay entry fee for the current period/contest/session
// @route   POST /api/entries/:slug/pay
// @access  Private
// ────────────────────────────────────────
const payEntry = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const { contestId, sessionId } = req.body;
    let entryFee = 0;
    let contest = null;
    let sessionDoc = null;
    let periodStart = null;

    if (contestId) {
      contest = await Contest.findById(contestId);
      entryFee = contest?.entryFee || 0;
      if (!contest) return res.status(400).json({ message: 'Contest not found' });
    } else if (sessionId) {
      sessionDoc = await Session.findById(sessionId);
      entryFee = sessionDoc?.entryFee || 0;
      if (!sessionDoc) return res.status(400).json({ message: 'Session not found' });
      const period = getSessionPeriod(sessionDoc);
      if (!period) return res.status(400).json({ message: 'Session has no active period configured' });
      periodStart = period.start;
    }

    if (entryFee <= 0) {
      return res.json({ success: true, message: 'No entry fee required' });
    }

    // Check if already paid
    const existingQuery = { user: req.user._id, game: game._id };
    if (contest) existingQuery.contest = contest._id;
    if (sessionDoc) {
      existingQuery.session = sessionDoc._id;
      existingQuery.periodStart = periodStart;
    }

    const existing = await GameEntry.findOne(existingQuery);
    if (existing) {
      return res.json({ success: true, message: 'Already entered' });
    }

    // Check wallet balance
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id, balance: 0 });

    if (wallet.balance < entryFee) {
      return res.status(400).json({
        message: 'Insufficient balance',
        required: entryFee,
        walletBalance: wallet.balance,
      });
    }

    // Deduct entry fee
    wallet.balance -= entryFee;
    await wallet.save();

    // Create entry record
    await GameEntry.create({
      user: req.user._id,
      game: game._id,
      contest: contest?._id || null,
      session: sessionDoc?._id || null,
      periodStart: periodStart || null,
      amountPaid: entryFee,
    });

    // Log as transaction
    await Transaction.create({
      user: req.user._id,
      type: 'debit',
      amount: entryFee,
      description: `Entry fee — ${game.name}`,
      game: game.name,
      contest: contest?._id || null,
      status: 'completed',
    });

    res.json({
      success: true,
      message: 'Entry paid',
      balance: wallet.balance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ success: true, message: 'Already entered' });
    }
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Pay per-attempt cost (session games)
// @route   POST /api/entries/:slug/pay-attempt
// @access  Private
// ────────────────────────────────────────
async function payAttempt(req, res) {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const { sessionId } = req.body;
    let attemptCost = 0;

    if (sessionId) {
      const sessionDoc = await Session.findById(sessionId);
      attemptCost = sessionDoc?.attemptCost || 0;
    }

    if (!attemptCost || attemptCost <= 0) {
      return res.json({ success: true, message: 'No attempt cost' });
    }

    // Check wallet balance
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id, balance: 0 });

    if (wallet.balance < attemptCost) {
      return res.status(400).json({
        message: 'Insufficient balance',
        required: attemptCost,
        walletBalance: wallet.balance,
      });
    }

    // Deduct attempt cost
    wallet.balance -= attemptCost;
    await wallet.save();

    // Log as transaction
    await Transaction.create({
      user: req.user._id,
      type: 'debit',
      amount: attemptCost,
      description: `Game attempt — ${game.name}`,
      game: game.name,
      status: 'completed',
    });

    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { checkEntry, payEntry, payAttempt };
