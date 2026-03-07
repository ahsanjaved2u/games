const Game = require('../models/Game');
const GameScore = require('../models/GameScore');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// ── Helper: ordinal suffix ──
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ────────────────────────────────────────
// @desc    Core prize distribution logic (shared by cron + manual)
//          - Fetches top N scores for the game
//          - Checks optional minPlayersThreshold
//          - Credits each winner's wallet + records transaction
//          - Marks game.prizesDistributed = true
// ────────────────────────────────────────
const distributeGamePrizes = async (game) => {
  if (game.prizesDistributed) {
    return { skipped: true, reason: 'Already distributed' };
  }

  if (!game.prizes || game.prizes.length === 0) {
    game.prizesDistributed = true;
    await game.save();
    return { skipped: true, reason: 'No prizes configured' };
  }

  // Get top N players (N = number of prize tiers)
  const topScores = await GameScore.find({ game: game.slug })
    .sort({ score: -1 })
    .limit(game.prizes.length)
    .populate('user', 'username email');

  // Enforce optional minimum-players threshold
  if (game.minPlayersThreshold > 0 && topScores.length < game.minPlayersThreshold) {
    return {
      skipped: true,
      reason: `Not enough players (${topScores.length} of ${game.minPlayersThreshold} required)`,
    };
  }

  const results = [];

  for (let i = 0; i < topScores.length; i++) {
    const scoreDoc = topScores[i];
    const prizeAmount = game.prizes[i];

    if (!scoreDoc || !prizeAmount) continue;

    // Credit wallet
    let wallet = await Wallet.findOne({ user: scoreDoc.user._id });
    if (!wallet) wallet = await Wallet.create({ user: scoreDoc.user._id, balance: 0 });
    wallet.balance += prizeAmount;
    await wallet.save();

    // Record transaction
    await Transaction.create({
      user: scoreDoc.user._id,
      type: 'credit',
      amount: prizeAmount,
      description: `${ordinal(i + 1)} place prize — ${game.name}`,
      game: game.slug,
      status: 'completed',
    });

    results.push({
      rank: i + 1,
      user: scoreDoc.user.username,
      prize: prizeAmount,
    });
  }

  game.prizesDistributed = true;
  game.isLive = false; // unpublish until admin starts a new round
  await game.save();

  return { distributed: true, results };
};

// ────────────────────────────────────────
// @desc    Admin manually ends competition early + distributes prizes
// @route   PATCH /api/games/:id/end-competition
// @access  Private/Admin
// ────────────────────────────────────────
const adminEndCompetitionNow = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (game.gameType !== 'competitive') {
      return res.status(400).json({ message: 'This is not a competitive game' });
    }
    if (game.prizesDistributed) {
      return res.status(400).json({ message: 'Prizes have already been distributed for this competition' });
    }

    // Stamp scheduleEnd = now so the cron won't double-fire
    game.scheduleEnd = new Date();

    const result = await distributeGamePrizes(game);

    res.json({ message: 'Competition ended and prizes processed', ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { distributeGamePrizes, adminEndCompetitionNow };
