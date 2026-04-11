const path = require('path');
const fs = require('fs');
const os = require('os');
const Game = require('../models/Game');
const Contest = require('../models/Contest');
const Session = require('../models/Session');
const { uploadToR2, deleteR2Folder } = require('../config/r2');

// Resolve the directory where game files are stored
const GAMES_DIR = process.env.GAMES_UPLOAD_DIR
  || path.resolve(__dirname, '../../frontend/public/games');

// Helper: check if a session's period is still running
const isSessionPeriodActive = (s) => {
  const periodMs = ((s.durationDays || 0) * 86400000)
    + ((s.durationHours || 0) * 3600000)
    + ((s.durationMinutes || 0) * 60000);
  if (periodMs <= 0) return false;
  const anchorMs = s.periodAnchor ? new Date(s.periodAnchor).getTime() : 0;
  return Date.now() < anchorMs + periodMs;
};

// Helper: Attach active contests and sessions to games array
const enrichGamesWithContestsSessions = async (games) => {
  const gameIds = games.map(g => g._id || g.id);
  const [contests, sessions] = await Promise.all([
    Contest.find({ game: { $in: gameIds }, status: { $in: ['scheduled', 'live'] } }).lean(),
    Session.find({ game: { $in: gameIds }, isActive: true }).lean(),
  ]);

  // Filter out sessions whose period has already expired (cron hasn't processed yet)
  const liveSessions = sessions.filter(isSessionPeriodActive);

  const contestMap = {};
  contests.forEach(c => {
    const gid = String(c.game);
    if (!contestMap[gid]) contestMap[gid] = [];
    contestMap[gid].push(c);
  });

  const sessionMap = {};
  liveSessions.forEach(s => {
    const gid = String(s.game);
    if (!sessionMap[gid]) sessionMap[gid] = [];
    sessionMap[gid].push(s);
  });

  return games.map(g => {
    const obj = g.toJSON ? g.toJSON() : { ...g };
    const gid = String(obj._id);
    obj.contests = contestMap[gid] || [];
    obj.sessions = sessionMap[gid] || [];
    return obj;
  });
};

// ────────────────────────────────────────
// @desc    Get all games (public)
// @route   GET /api/games
// @access  Public
// Only returns games that have at least one live/scheduled contest or active session
// ────────────────────────────────────────
const getGames = async (req, res) => {
  try {
    // Find game IDs that have a published contest or active session
    const [contestGameIds, activeSessions] = await Promise.all([
      Contest.distinct('game', { status: { $in: ['scheduled', 'live'] } }),
      Session.find({ isActive: true }).lean(),
    ]);
    // Only include sessions whose period hasn't expired yet
    const sessionGameIds = activeSessions.filter(isSessionPeriodActive).map(s => s.game);
    const visibleGameIds = [...new Set([...contestGameIds, ...sessionGameIds].map(String))];
    if (visibleGameIds.length === 0) return res.json([]);

    const games = await Game.find({ _id: { $in: visibleGameIds } }).sort({ createdAt: -1 });
    const enriched = await enrichGamesWithContestsSessions(games);
    res.json(enriched);
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

    const now = new Date();

    // Auto-promote scheduled→live contests whose start has passed
    await Contest.updateMany(
      { game: game._id, status: 'scheduled', startDate: { $lte: now }, endDate: { $gt: now } },
      { $set: { status: 'live' } }
    );

    // Fetch published contests and active sessions
    const [contests, sessions] = await Promise.all([
      Contest.find({ game: game._id, status: { $in: ['scheduled', 'live'] } }).lean(),
      Session.find({ game: game._id, isActive: true }).lean(),
    ]);

    // Game is only accessible if it has at least one published contest or active session
    if (contests.length === 0 && sessions.length === 0) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Auto-publish game if needed
    if (!game.isLive) {
      game.isLive = true;
      await game.save();
    }

    const obj = game.toJSON();
    obj.contests = contests;
    obj.sessions = sessions;

    res.json(obj);
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
    const enriched = await enrichGamesWithContestsSessions(games);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Create a new game (simplified)
// @route   POST /api/games
// @access  Private/Admin
// ────────────────────────────────────────
const createGame = async (req, res) => {
  try {
    const { name, slug, description, thumbnail, gamePath, tag } = req.body;

    const existing = await Game.findOne({ slug });
    if (existing) return res.status(400).json({ message: 'A game with this slug already exists' });

    const game = await Game.create({
      name,
      slug,
      description: description || '',
      thumbnail: thumbnail || '',
      gamePath: gamePath || slug,
      tag: tag || '',
      isLive: false,
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

    const fields = ['name', 'slug', 'description', 'thumbnail', 'gamePath'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) game[f] = req.body[f];
    });

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

    // Delete game files from R2
    let r2Error = null;
    if (game.gamePath) {
      console.log(`[deleteGame] Deleting R2 folder: ${game.gamePath}/`);
      try {
        await deleteR2Folder(`${game.gamePath}/`);
        console.log(`[deleteGame] R2 cleanup successful for: ${game.gamePath}`);
      } catch (err) {
        console.error('[deleteGame] R2 cleanup failed:', err.message);
        r2Error = err.message;
        // Still delete DB record even if R2 cleanup fails
      }
    } else {
      console.warn('[deleteGame] No gamePath set — skipping R2 cleanup');
    }

    await game.deleteOne();
    res.json({
      message: 'Game deleted',
      r2Cleaned: !!game.gamePath && !r2Error,
      ...(r2Error && { r2Warning: `R2 cleanup failed: ${r2Error}. Files may still exist on Cloudflare R2.` }),
    });
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

    // Extract to a temporary directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'game-'));
    zip.extractAllTo(tmpDir, true);

    // Determine root: if index.html is inside a subfolder, use that subfolder as root
    let gameRoot = tmpDir;
    if (!fs.existsSync(path.join(tmpDir, 'index.html'))) {
      const entries = fs.readdirSync(tmpDir);
      for (const entry of entries) {
        const subPath = path.join(tmpDir, entry);
        if (fs.statSync(subPath).isDirectory() && fs.existsSync(path.join(subPath, 'index.html'))) {
          gameRoot = subPath;
          break;
        }
      }
    }

    // Delete old files on R2 for this game path
    await deleteR2Folder(`${game.gamePath}/`);

    // Recursively upload all files to R2 AND copy to local GAMES_DIR for dev
    const uploadDir = async (dir, prefix) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const key = prefix ? `${prefix}/${item}` : item;
        if (fs.statSync(fullPath).isDirectory()) {
          await uploadDir(fullPath, key);
        } else {
          const fileBuffer = fs.readFileSync(fullPath);
          await uploadToR2(`${game.gamePath}/${key}`, fileBuffer);
          // Also write to local games dir for local dev (GAMES_DIR)
          const localDest = path.join(GAMES_DIR, game.gamePath, key);
          fs.mkdirSync(path.dirname(localDest), { recursive: true });
          fs.writeFileSync(localDest, fileBuffer);
        }
      }
    };
    await uploadDir(gameRoot, '');

    // Also upload the SDK so games can reference /sdk/gamezone-sdk.js from R2
    const sdkPath = path.resolve(__dirname, '../../frontend/public/sdk/gamezone-sdk.js');
    if (fs.existsSync(sdkPath)) {
      await uploadToR2('sdk/gamezone-sdk.js', fs.readFileSync(sdkPath));
    }

    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });

    res.json({ message: 'Game files uploaded to R2', gamePath: game.gamePath });
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
