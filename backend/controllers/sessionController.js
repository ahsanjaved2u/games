// ══════════════════════════════════════════════════════════════════════════════
//  SESSION CONTROLLER — CRUD for sessions (rewarding play)
//
//  A Session is a recurring time window. Players earn PKR in real-time.
//
//  KEY FIELDS:
//    - durationDays / durationHours / durationMinutes: period length.
//    - periodAnchor: start of the current period. Period ends at anchor + duration.
//    - conversionRate: score-to-PKR ratio. PKR = score / conversionRate.
//      If 0, no wallet credits happen (PKR hidden in HUD).
//    - showCurrency: whether the HUD should display the PKR indicator.
//      Both showCurrency=true AND conversionRate>0 are needed for PKR to show.
//    - tag: optional badge text shown on GameCard (e.g. "Hot", "New").
//    - entryFee: one-time fee to enter (0 = free).
//    - attemptCost: PKR deducted per "Try Again" (0 = free retries).
//    - pause: if true, the cron will end the session but NOT spawn a successor.
//      Setting pause=false on an ended session spawns a fresh successor immediately.
//    - color, instructions, hasTimeLimit, timeLimitSeconds: same as contests.
//
//  REAL-TIME REWARDS:
//    When a score is submitted in session mode (scoreController.js), the wallet
//    is credited immediately: PKR = score / conversionRate.
//    This is the key difference from contests (which only award prizes at the end).
//
//  SESSION LIFECYCLE (cron in server.js):
//    period expires → archive SessionPeriod → end session → spawn successor
//    Successor inherits ALL config fields (conversionRate, showCurrency, tag, etc.).
// ══════════════════════════════════════════════════════════════════════════════

const Session = require('../models/Session');
const Game = require('../models/Game');
const { broadcastEvent } = require('../utils/sse');

// ────────────────────────────────────────
// @desc    Get all sessions for a game
// @route   GET /api/sessions/game/:gameId
// @access  Private/Admin
// ────────────────────────────────────────
const getSessionsForGame = async (req, res) => {
  try {
    const sessions = await Session.find({ game: req.params.gameId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get active sessions for a game (public)
// @route   GET /api/sessions/active/:gameId
// @access  Public
// ────────────────────────────────────────
const getActiveSessionsForGame = async (req, res) => {
  try {
    const sessions = await Session.find({ game: req.params.gameId, isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get a single session by ID
// @route   GET /api/sessions/:id
// @access  Public
// ────────────────────────────────────────
const getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('game', 'name slug');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Create a new session for a game
// @route   POST /api/sessions
// @access  Private/Admin
// ────────────────────────────────────────
const createSession = async (req, res) => {
  try {
    const {
      gameId, name, tag,
      durationDays, durationHours, durationMinutes,
      conversionRate, showCurrency,
      entryFee, attemptCost,
      hasTimeLimit, timeLimitSeconds,
      color, instructions,
    } = req.body;

    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const totalMs = ((durationDays || 0) * 86400000)
      + ((durationHours || 0) * 3600000)
      + ((durationMinutes || 0) * 60000);
    if (totalMs <= 0) {
      return res.status(400).json({ message: 'Session must have a duration greater than 0' });
    }

    const session = await Session.create({
      game: gameId,
      name: name || '',
      durationDays: durationDays || 0,
      durationHours: durationHours || 0,
      durationMinutes: durationMinutes || 0,
      periodAnchor: new Date(),
      conversionRate: conversionRate || 0,
      showCurrency: showCurrency || false,
      entryFee: entryFee || 0,
      attemptCost: attemptCost || 0,
      hasTimeLimit: hasTimeLimit || false,
      timeLimitSeconds: timeLimitSeconds || 0,
      color: color || '#00e5ff',
      tag: tag || '',
      instructions: instructions || [],
    });

    // Auto-publish the game when a session is created
    if (!game.isLive) {
      game.isLive = true;
      await game.save();
    }

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Update an existing session
// @route   PUT /api/sessions/:id
// @access  Private/Admin
// ────────────────────────────────────────
const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const {
      name, tag, isActive,
      durationDays, durationHours, durationMinutes,
      conversionRate, showCurrency,
      entryFee, attemptCost,
      hasTimeLimit, timeLimitSeconds,
      color, instructions,
    } = req.body;

    if (name !== undefined) session.name = name;
    if (isActive !== undefined) session.isActive = isActive;
    if (req.body.pause !== undefined) session.pause = req.body.pause;
    if (durationDays !== undefined) session.durationDays = durationDays;
    if (durationHours !== undefined) session.durationHours = durationHours;
    if (durationMinutes !== undefined) session.durationMinutes = durationMinutes;
    if (conversionRate !== undefined) session.conversionRate = conversionRate;
    if (showCurrency !== undefined) session.showCurrency = showCurrency;
    if (entryFee !== undefined) session.entryFee = entryFee;
    if (attemptCost !== undefined) session.attemptCost = attemptCost;
    if (hasTimeLimit !== undefined) session.hasTimeLimit = hasTimeLimit;
    if (timeLimitSeconds !== undefined) session.timeLimitSeconds = timeLimitSeconds;
    if (color !== undefined) session.color = color;
    if (tag !== undefined) session.tag = tag;
    if (instructions !== undefined) session.instructions = instructions;

    const totalMs = ((session.durationDays || 0) * 86400000)
      + ((session.durationHours || 0) * 3600000)
      + ((session.durationMinutes || 0) * 60000);
    if (totalMs <= 0) {
      return res.status(400).json({ message: 'Session must have a duration greater than 0' });
    }

    await session.save();

    // If admin unpaused an ended session, spawn a fresh successor immediately
    if (req.body.pause === false && session.ended) {
      const fresh = await Session.create({
        game: session.game,
        name: session.name,
        isActive: true,
        ended: false,
        pause: false,
        durationDays: session.durationDays,
        durationHours: session.durationHours,
        durationMinutes: session.durationMinutes,
        periodAnchor: new Date(),
        conversionRate: session.conversionRate,
        showCurrency: session.showCurrency,
        entryFee: session.entryFee,
        attemptCost: session.attemptCost,
        hasTimeLimit: session.hasTimeLimit,
        timeLimitSeconds: session.timeLimitSeconds,
        color: session.color,
        tag: session.tag,
        instructions: session.instructions,
      });
      broadcastEvent('session-update', { sessionId: fresh._id, gameId: fresh.game });
    }

    // Broadcast so player pages update in real time
    broadcastEvent('session-update', { sessionId: session._id, gameId: session.game });

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Delete a session
// @route   DELETE /api/sessions/:id
// @access  Private/Admin
// ────────────────────────────────────────
const deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    await session.deleteOne();
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// Helper: compute current period for a session
// ────────────────────────────────────────
const getSessionPeriod = (sessionDoc) => {
  const periodMs = ((sessionDoc.durationDays || 0) * 86400000)
    + ((sessionDoc.durationHours || 0) * 3600000)
    + ((sessionDoc.durationMinutes || 0) * 60000);
  if (periodMs <= 0) return null;
  const now = Date.now();
  const anchor = sessionDoc.periodAnchor ? new Date(sessionDoc.periodAnchor).getTime() : 0;
  const elapsed = now - anchor;
  const start = new Date(anchor + Math.floor(elapsed / periodMs) * periodMs);
  const end = new Date(start.getTime() + periodMs);
  return { start, end, periodMs };
};

module.exports = {
  getSessionsForGame,
  getActiveSessionsForGame,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getSessionPeriod,
};
