// ══════════════════════════════════════════════════════════════════════════════
//  CONTEST CONTROLLER — CRUD for contests (competitions)
//
//  A Contest is a time-bound competition. Players compete for ranked prizes.
//
//  KEY FIELDS:
//    - startDate / endDate: defines the contest window.
//    - status: 'scheduled' → 'live' → 'ended' → 'distributed' (managed by cron in server.js).
//    - prizes: array of PKR amounts for top N positions [1st, 2nd, 3rd, ...].
//    - entryFee: one-time fee to enter (0 = free).
//    - tag: optional badge text shown on GameCard (e.g. "Hot", "New").
//    - hasTimeLimit / timeLimitSeconds: per-attempt time limit in the game.
//    - color: accent color for the contest card/HUD.
//    - instructions: array of {icon, title, text} shown before playing.
//
//  PRIZE DISTRIBUTION:
//    Handled by the cron in server.js, NOT here. When a contest ends,
//    the cron distributes prizes to top scorers' wallets.
//
//  NO REAL-TIME REWARDS:
//    Unlike sessions, contests do NOT credit wallets on each score submission.
//    The HUD hides PKR display entirely in contest mode.
// ══════════════════════════════════════════════════════════════════════════════

const Contest = require('../models/Contest');
const Game = require('../models/Game');

// ────────────────────────────────────────
// @desc    Get all contests for a game
// @route   GET /api/contests/game/:gameId
// @access  Private/Admin
// ────────────────────────────────────────
const getContestsForGame = async (req, res) => {
  try {
    const contests = await Contest.find({ game: req.params.gameId })
      .sort({ startDate: -1 })
      .lean();
    res.json(contests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get a single contest by ID
// @route   GET /api/contests/:id
// @access  Public
// ────────────────────────────────────────
const getContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id).populate('game', 'name slug');
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    res.json(contest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Create a new contest for a game
// @route   POST /api/contests
// @access  Private/Admin
// ────────────────────────────────────────
const createContest = async (req, res) => {
  try {
    const {
      gameId, name, tag, startDate, endDate, entryFee, prizes, minPlayersThreshold,
      hasTimeLimit, timeLimitSeconds, color, instructions,
    } = req.body;

    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const now = new Date();
    const status = now >= start && now < end ? 'live' : (now >= end ? 'ended' : 'scheduled');

    const contest = await Contest.create({
      game: gameId,
      name: name || '',
      status,
      startDate: start,
      endDate: end,
      entryFee: entryFee || 0,
      prizes: prizes || [],
      minPlayersThreshold: minPlayersThreshold || 0,
      hasTimeLimit: hasTimeLimit || false,
      timeLimitSeconds: timeLimitSeconds || 0,
      color: color || '#00e5ff',
      tag: tag || '',
      instructions: instructions || [],
    });

    // Auto-publish the game when a live contest is created
    if (status === 'live' && !game.isLive) {
      game.isLive = true;
      await game.save();
    }

    res.status(201).json(contest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Update an existing contest
// @route   PUT /api/contests/:id
// @access  Private/Admin
// ────────────────────────────────────────
const updateContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (contest.status === 'distributed') {
      return res.status(400).json({ message: 'Cannot edit a contest that has already distributed prizes' });
    }

    const {
      name, tag, startDate, endDate, entryFee, prizes, minPlayersThreshold,
      hasTimeLimit, timeLimitSeconds, color, instructions,
    } = req.body;

    if (name !== undefined) contest.name = name;
    if (startDate) contest.startDate = new Date(startDate);
    if (endDate) contest.endDate = new Date(endDate);
    if (entryFee !== undefined) contest.entryFee = entryFee;
    if (prizes !== undefined) contest.prizes = prizes;
    if (minPlayersThreshold !== undefined) contest.minPlayersThreshold = minPlayersThreshold;
    if (hasTimeLimit !== undefined) contest.hasTimeLimit = hasTimeLimit;
    if (timeLimitSeconds !== undefined) contest.timeLimitSeconds = timeLimitSeconds;
    if (color !== undefined) contest.color = color;
    if (tag !== undefined) contest.tag = tag;
    if (instructions !== undefined) contest.instructions = instructions;

    if (contest.endDate <= contest.startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Recompute status based on new dates
    const now = new Date();
    if (contest.status !== 'cancelled') {
      if (now < contest.startDate) contest.status = 'scheduled';
      else if (now < contest.endDate) contest.status = 'live';
      else contest.status = 'ended';
    }

    await contest.save();

    // Update game's isLive based on any remaining live contests
    const game = await Game.findById(contest.game);
    if (game) {
      const anyLive = await Contest.findOne({ game: contest.game, status: 'live' });
      game.isLive = !!anyLive;
      await game.save();
    }

    res.json(contest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    End a contest and distribute prizes
// @route   PATCH /api/contests/:id/cancel
// @access  Private/Admin
// ────────────────────────────────────────
const cancelContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (contest.status === 'distributed') {
      return res.status(400).json({ message: 'Prizes have already been distributed for this contest' });
    }
    if (contest.prizesDistributed) {
      return res.status(400).json({ message: 'Prizes have already been distributed for this contest' });
    }

    // End the contest now and distribute prizes
    contest.endDate = new Date();
    contest.status = 'ended';
    await contest.save();

    const { distributeContestPrizes } = require('./competitionController');
    const result = await distributeContestPrizes(contest);

    console.log(`[Admin] Contest ${contest._id} ended manually. Distribution result:`, result);

    res.json({ message: 'Contest ended and prizes distributed', ...result });
  } catch (error) {
    console.error(`[Admin] Error ending contest ${req.params.id}:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get the active contest for a game (by slug)
// @route   GET /api/contests/active/:slug
// @access  Public
// ────────────────────────────────────────
const getActiveContest = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const contests = await Contest.find({
      game: game._id,
      status: { $in: ['scheduled', 'live'] },
    }).sort({ startDate: 1 }).lean();

    res.json(contests.length > 0 ? contests : []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getContestsForGame,
  getContest,
  createContest,
  updateContest,
  cancelContest,
  getActiveContest,
};
