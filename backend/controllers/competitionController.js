const Game = require('../models/Game');
const Contest = require('../models/Contest');
const GameScore = require('../models/GameScore');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { pushEvent } = require('../utils/sse');

// ── Helper: ordinal suffix ──
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ────────────────────────────────────────
// @desc    Core prize distribution logic (uses Contest model)
//          - Fetches top N scores for the contest
//          - Checks minPlayersThreshold
//          - Credits each winner's wallet + records transaction
//          - Marks contest as distributed
// ────────────────────────────────────────
const distributeContestPrizes = async (contest) => {
  console.log(`[Prize] Starting distribution for contest ${contest._id}, status=${contest.status}, prizesDistributed=${contest.prizesDistributed}`);

  if (contest.prizesDistributed) {
    return { skipped: true, reason: 'Already distributed' };
  }

  // Atomic guard: only one caller wins the race
  const claimed = await Contest.findOneAndUpdate(
    { _id: contest._id, prizesDistributed: false },
    { $set: { prizesDistributed: true, status: 'distributed' } },
    { new: true }
  );
  if (!claimed) {
    return { skipped: true, reason: 'Already distributed (race guard)' };
  }

  // Re-read game from contest (handle both populated and unpopulated)
  const gameId = contest.game?._id || contest.game;
  const game = await Game.findById(gameId);
  if (!game) {
    console.error(`[Prize] Game not found for contest ${contest._id}, gameRef=${gameId}`);
    return { skipped: true, reason: 'Game not found' };
  }

  console.log(`[Prize] Game: ${game.name} (slug=${game.slug}), prizes=${JSON.stringify(contest.prizes)}`);

  if (!contest.prizes || contest.prizes.length === 0) {
    // Check if other contests/sessions need the game live
    const otherLive = await Contest.findOne({ game: game._id, status: 'live', _id: { $ne: contest._id } });
    const Session = require('../models/Session');
    const activeSession = await Session.findOne({ game: game._id, isActive: true });
    if (!otherLive && !activeSession) {
      game.isLive = false;
      await game.save();
    }
    return { skipped: true, reason: 'No prizes configured' };
  }

  const contestObjId = contest._id;
  const contestId = String(contest._id);

  // Get top N players for THIS contest, one per user (best score wins)
  // Try matching by ObjectId first, then fall back to string contestId
  let topScores = await GameScore.aggregate([
    { $match: { game: game.slug, contest: contestObjId } },
    { $sort: { score: -1 } },
    { $group: { _id: '$user', bestScore: { $max: '$score' }, docId: { $first: '$_id' } } },
    { $sort: { bestScore: -1 } },
    { $limit: contest.prizes.length },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDoc' } },
    { $unwind: '$userDoc' },
    { $project: { userId: '$_id', name: '$userDoc.name', email: '$userDoc.email', score: '$bestScore' } },
  ]);

  console.log(`[Prize] Found ${topScores.length} scores by ObjectId match for contest ${contestId}`);

  // Fallback: if no scores found by ObjectId, try string-based contestId field
  if (topScores.length === 0) {
    topScores = await GameScore.aggregate([
      { $match: { game: game.slug, contestId: contestId } },
      { $sort: { score: -1 } },
      { $group: { _id: '$user', bestScore: { $max: '$score' }, docId: { $first: '$_id' } } },
      { $sort: { bestScore: -1 } },
      { $limit: contest.prizes.length },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDoc' } },
      { $unwind: '$userDoc' },
      { $project: { userId: '$_id', name: '$userDoc.name', email: '$userDoc.email', score: '$bestScore' } },
    ]);
    console.log(`[Prize] Fallback: found ${topScores.length} scores by string contestId for contest ${contestId}`);
  }

  // Enforce minimum-players threshold
  if (contest.minPlayersThreshold > 0 && topScores.length < contest.minPlayersThreshold) {
    // Revert so it can be retried or handled
    await Contest.updateOne({ _id: contest._id }, { $set: { prizesDistributed: false, status: 'ended' } });
    return {
      skipped: true,
      reason: `Not enough players (${topScores.length} of ${contest.minPlayersThreshold} required)`,
    };
  }

  if (topScores.length === 0) {
    console.warn(`[Prize] No scores found at all for contest ${contestId} (game=${game.slug}). No prizes distributed.`);
  }

  const results = [];

  for (let i = 0; i < topScores.length; i++) {
    const scoreDoc = topScores[i];
    const prizeAmount = contest.prizes[i];

    if (!scoreDoc || !prizeAmount || !scoreDoc.userId) continue;

    const desc = `${ordinal(i + 1)} place prize — ${game.name}`;

    console.log(`[Prize] Crediting ${scoreDoc.name} (${scoreDoc.userId}) — PKR ${prizeAmount} for ${desc}`);

    // Prevent duplicate: check if transaction already exists for this user + contest + rank
    const existingTxn = await Transaction.findOne({
      user: scoreDoc.userId,
      contest: contestObjId,
      type: 'credit',
      description: desc,
    });

    if (existingTxn) {
      console.log(`[Prize] Transaction already existed for ${scoreDoc.name}, skipping wallet credit`);
      continue;
    }

    // Create the prize transaction
    await Transaction.create({
      user: scoreDoc.userId,
      type: 'credit',
      amount: prizeAmount,
      description: desc,
      game: game.slug,
      contest: contestObjId,
      contestId,
      status: 'completed',
    });

    // Credit wallet using atomic $inc
    const wallet = await Wallet.findOneAndUpdate(
      { user: scoreDoc.userId },
      { $inc: { balance: prizeAmount } },
      { new: true, upsert: true }
    );

    console.log(`[Prize] Wallet credited: ${scoreDoc.name} now has PKR ${wallet.balance}`);

    pushEvent(String(scoreDoc.userId), 'wallet-update', { balance: wallet.balance });

    results.push({
      rank: i + 1,
      user: scoreDoc.name,
      prize: prizeAmount,
    });
  }

  // Unpublish game only if no other live contests or active sessions remain
  const otherLive = await Contest.findOne({ game: game._id, status: 'live', _id: { $ne: contest._id } });
  const Session = require('../models/Session');
  const activeSession = await Session.findOne({ game: game._id, isActive: true });
  if (!otherLive && !activeSession) {
    game.isLive = false;
    await game.save();
  }

  console.log(`[Prize] Distribution complete for contest ${contestId}: ${results.length} winners`);
  return { distributed: true, results };
};

// ────────────────────────────────────────
// @desc    Admin manually ends competition early + distributes prizes
// @route   PATCH /api/games/:id/end-competition
// @access  Private/Admin
// ────────────────────────────────────────
const adminEndCompetitionNow = async (req, res) => {
  try {
    const { contestId } = req.body;
    if (!contestId) {
      return res.status(400).json({ message: 'contestId is required' });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    if (contest.prizesDistributed) {
      return res.status(400).json({ message: 'Prizes have already been distributed for this contest' });
    }

    // End the contest now
    contest.endDate = new Date();
    contest.status = 'ended';
    await contest.save();

    const result = await distributeContestPrizes(contest);

    res.json({ message: 'Competition ended and prizes processed', ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { distributeContestPrizes, adminEndCompetitionNow };
