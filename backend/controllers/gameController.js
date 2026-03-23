const path = require('path');
const fs = require('fs');
const Game = require('../models/Game');

// Resolve the directory where game files are stored
// Default: ../frontend/public/games  (local dev)
// Override with GAMES_UPLOAD_DIR env for S3 or other storage
const GAMES_DIR = process.env.GAMES_UPLOAD_DIR
  || path.resolve(__dirname, '../../frontend/public/games');

// ────────────────────────────────────────
// @desc    Get all games (public — includes non-live for display)
// @route   GET /api/games
// @access  Public
// ────────────────────────────────────────
const getGames = async (req, res) => {
  try {
    // Auto-publish / unpublish competitive games based on schedule
    const now = new Date();
    await Game.updateMany(
      { gameType: 'competitive', scheduleStart: { $lte: now }, scheduleEnd: { $gt: now }, isLive: false, prizesDistributed: { $ne: true }, manualUnpublish: { $ne: true } },
      { $set: { isLive: true } }
    );
    await Game.updateMany(
      { gameType: 'competitive', scheduleEnd: { $lte: now }, isLive: true },
      { $set: { isLive: false } }
    );

    const games = await Game.find()
      .select('-instructions')
      .sort({ createdAt: -1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get single game by slug (public)
// @route   GET /api/games/:slug
// @access  Public
// ────────────────────────────────────────
const getGameBySlug = async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    if (!game) return res.status(404).json({ message: 'Game not found' });

    // Competitive: check schedule window in case auto-publish hasn't fired yet
    if (!game.isLive && game.gameType === 'competitive' && game.scheduleStart && game.scheduleEnd) {
      const now = new Date();
      if (now >= new Date(game.scheduleStart) && now < new Date(game.scheduleEnd) && !game.prizesDistributed && !game.manualUnpublish) {
        game.isLive = true;
        await game.save();
      }
    }

    if (!game.isLive) return res.status(404).json({ message: 'Game not found' });
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get ALL games (admin — includes non-live)
// @route   GET /api/games/admin/all
// @access  Private/Admin
// ────────────────────────────────────────
const getAllGamesAdmin = async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Create a new game (metadata only)
// @route   POST /api/games
// @access  Private/Admin
// ────────────────────────────────────────
const createGame = async (req, res) => {
  try {
    const { name, slug, description, thumbnail, isLive, gamePath, instructions, tag, color, scheduleStart, scheduleEnd, showSchedule, gameType, conversionRate, showCurrency, prizes, minPlayersThreshold, hasTimeLimit, timeLimitSeconds, rewardPeriodDays, rewardPeriodHours, rewardPeriodMinutes, entryFee, attemptCost } = req.body;

    const existing = await Game.findOne({ slug });
    if (existing) return res.status(400).json({ message: 'A game with this slug already exists' });

    const resolvedType = gameType || 'rewarding';
    const start = scheduleStart ? new Date(scheduleStart) : null;
    const end = scheduleEnd ? new Date(scheduleEnd) : null;
    const now = new Date();
    // Competitive: isLive is schedule-driven; rewarding: use provided value
    const resolvedIsLive = resolvedType === 'competitive'
      ? !!(start && end && now >= start && now < end)
      : (isLive || false);

    // Unique contest ID — changes whenever the schedule changes so each round gets its own leaderboard
    const activeContestId = (resolvedType === 'competitive' && start)
      ? `${start.toISOString()}_${end ? end.toISOString() : 'open'}`
      : null;

    const game = await Game.create({
      name, slug, description, thumbnail,
      isLive: resolvedIsLive,
      gamePath: gamePath || slug,
      instructions: instructions || [],
      tag: tag || '',
      color: color || '#00e5ff',
      gameType: resolvedType,
      conversionRate: conversionRate || 0,
      showCurrency: showCurrency || false,
      prizes: prizes || [],
      scheduleStart: start,
      scheduleEnd: end,
      showSchedule: showSchedule || false,
      prizesDistributed: false,
      minPlayersThreshold: minPlayersThreshold || 0,
      activeContestId,
      hasTimeLimit: hasTimeLimit || false,
      timeLimitSeconds: timeLimitSeconds || 0,
      rewardPeriodDays: rewardPeriodDays || 0,
      rewardPeriodHours: rewardPeriodHours || 0,
      rewardPeriodMinutes: rewardPeriodMinutes || 0,
      periodAnchor: new Date(),
      entryFee: entryFee || 0,
      attemptCost: attemptCost || 0,
    });

    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Update game metadata
// @route   PUT /api/games/:id
// @access  Private/Admin
// ────────────────────────────────────────
const updateGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const fields = ['name', 'slug', 'description', 'thumbnail', 'isLive', 'gamePath', 'instructions', 'tag', 'color', 'gameType', 'conversionRate', 'showCurrency', 'prizes', 'scheduleStart', 'scheduleEnd', 'showSchedule', 'minPlayersThreshold', 'hasTimeLimit', 'timeLimitSeconds', 'rewardPeriodDays', 'rewardPeriodHours', 'rewardPeriodMinutes', 'entryFee', 'attemptCost'];

    // If admin changes schedule (start or end), reset prizesDistributed so the new round can pay out
    const incomingEnd = req.body.scheduleEnd;
    const incomingStart = req.body.scheduleStart;
    const currentEnd = game.scheduleEnd ? new Date(game.scheduleEnd).toISOString() : null;
    const currentStart = game.scheduleStart ? new Date(game.scheduleStart).toISOString() : null;
    const scheduleChanged =
      (incomingEnd !== undefined && (incomingEnd ? new Date(incomingEnd).toISOString() : null) !== currentEnd) ||
      (incomingStart !== undefined && (incomingStart ? new Date(incomingStart).toISOString() : null) !== currentStart);
    if (scheduleChanged) {
      game.prizesDistributed = false;
      // New schedule round → clear manual unpublish so auto-publish can work
      game.manualUnpublish = false;
    }

    // Check if reward period fields are changing BEFORE applying updates
    const periodFields = ['rewardPeriodDays', 'rewardPeriodHours', 'rewardPeriodMinutes'];
    const periodChanged = periodFields.some(f => req.body[f] !== undefined && Number(req.body[f]) !== Number(game[f]));

    fields.forEach(f => {
      if (req.body[f] !== undefined) game[f] = req.body[f];
    });

    // If reward period fields changed, reset the period anchor so the new period starts now
    if (periodChanged) {
      game.periodAnchor = new Date();
    }

    // Recompute activeContestId from current schedule — ensures each unique start+end pair
    // gets its own contest ID, preventing old frozen leaderboards from being overwritten
    if (game.gameType === 'competitive' && game.scheduleStart) {
      game.activeContestId = `${new Date(game.scheduleStart).toISOString()}_${game.scheduleEnd ? new Date(game.scheduleEnd).toISOString() : 'open'}`;
    }

    // For competitive games, isLive is fully schedule-driven — compute it now
    // so saving the form never accidentally publishes/unpublishes out of band
    if (game.gameType === 'competitive') {
      const now = new Date();
      const start = game.scheduleStart ? new Date(game.scheduleStart) : null;
      const end = game.scheduleEnd ? new Date(game.scheduleEnd) : null;
      game.isLive = !!(start && end && now >= start && now < end && !game.prizesDistributed);
    }

    const updated = await game.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Delete a game
// @route   DELETE /api/games/:id
// @access  Private/Admin
// ────────────────────────────────────────
const deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    await game.deleteOne();
    res.json({ message: 'Game deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Toggle game live status
// @route   PATCH /api/games/:id/toggle-live
// @access  Private/Admin
// ────────────────────────────────────────
const toggleLive = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    game.isLive = !game.isLive;
    // Admin manually unpublishing → block auto-publish; re-publishing → clear block
    game.manualUnpublish = !game.isLive;
    await game.save();
    res.json({ isLive: game.isLive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Upload game ZIP and extract
// @route   POST /api/games/:id/upload
// @access  Private/Admin
// ────────────────────────────────────────
const uploadGameFiles = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(req.file.buffer);
    const destDir = path.join(GAMES_DIR, game.gamePath);

    // Create directory if it doesn't exist
    fs.mkdirSync(destDir, { recursive: true });

    // Extract ZIP contents
    zip.extractAllTo(destDir, true);

    // Check if index.html exists (it might be in a subfolder)
    const indexExists = fs.existsSync(path.join(destDir, 'index.html'));
    if (!indexExists) {
      // Check one level deep for index.html (in case ZIP has a root folder)
      const entries = fs.readdirSync(destDir);
      for (const entry of entries) {
        const subPath = path.join(destDir, entry);
        if (fs.statSync(subPath).isDirectory()) {
          if (fs.existsSync(path.join(subPath, 'index.html'))) {
            // Move contents up one level
            const subEntries = fs.readdirSync(subPath);
            for (const se of subEntries) {
              fs.renameSync(path.join(subPath, se), path.join(destDir, se));
            }
            fs.rmdirSync(subPath);
            break;
          }
        }
      }
    }

    res.json({ message: 'Game files uploaded and extracted', gamePath: game.gamePath });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getGames,
  getGameBySlug,
  getAllGamesAdmin,
  createGame,
  updateGame,
  deleteGame,
  toggleLive,
  uploadGameFiles,
};
