// ══════════════════════════════════════════════════════════════════════════════
//  SCORE CONTROLLER — Contest vs Session logic (IMPORTANT)
//
//  Contest and Session are MUTUALLY EXCLUSIVE. A score belongs to one or the other, never both.
//
//  CONTEST (Competition):
//    - Player scores are saved with contestId.
//    - NO real-time wallet credits happen. Prizes are distributed ONLY when
//      the contest ends (see server.js cron → prize distribution).
//    - The frontend sends ONLY { contestId } in the score POST body.
//
//  SESSION (Rewarding):
//    - Player scores are saved with sessionId + sessionPeriod.
//    - Real-time wallet credits happen IF conversionRate > 0.
//      Formula: PKR earned = score / conversionRate.
//    - The frontend sends ONLY { sessionId } in the score POST body.
//
//  PRIORITY: If both contestId and sessionId are somehow sent, contest wins.
//    The session block uses: if (!contest && sessionId) { ... }
//
//  WALLET CREDIT: Only sessions trigger creditRewardingGame().
//    Contests NEVER credit wallets here — prizes go through the cron.
// ══════════════════════════════════════════════════════════════════════════════

const GameScore = require('../models/GameScore');
const Game = require('../models/Game');
const Contest = require('../models/Contest');
const Session = require('../models/Session');
const User = require('../models/User');
const GameEntry = require('../models/GameEntry');
const { creditRewardingGame } = require('./walletController');
const { creditReferralBonus } = require('./referralController');
const { getSessionPeriod } = require('./sessionController');

// @desc    Save a game score
// @route   POST /api/scores
// @access  Private
const saveScore = async (req, res) => {
  try {
    const { game, points, time, score, contestId, sessionId } = req.body;

    if (!game || points === undefined || time === undefined || score === undefined) {
      return res.status(400).json({ message: 'game, points, time, and score are required' });
    }

    const gameDoc = await Game.findOne({ slug: game });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // IMPORTANT: Contest (competition) and Session (rewarding)
    // are MUTUALLY EXCLUSIVE. A score belongs to one or the other.
    //   • Contest  → prizes distributed at end, NO real-time wallet credit
    //   • Session  → real-time wallet credit based on conversionRate
    // If both IDs are sent, contest takes priority (session is ignored).
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // ── COMPETITION: Resolve contest ──
    let contest = null;
    if (contestId) {
      contest = await Contest.findById(contestId);
      if (!contest || contest.status === 'distributed' || contest.status === 'cancelled') {
        return res.status(403).json({ message: 'This contest has ended and prizes have been distributed.' });
      }
      if (contest.status !== 'live') {
        return res.status(403).json({ message: 'This contest is not currently live.' });
      }
    }

    // ── REWARDING: Resolve session (only when NOT a contest score) ──
    let sessionDoc = null;
    let sessionPeriod = null;
    if (!contest && sessionId) {
      sessionDoc = await Session.findById(sessionId);
      if (!sessionDoc || !sessionDoc.isActive) {
        return res.status(403).json({ message: 'This session is not active.' });
      }
      sessionPeriod = getSessionPeriod(sessionDoc);
    }

    // ── Entry fee gate ──
    if (contest && contest.entryFee > 0) {
      const entry = await GameEntry.findOne({ user: req.user._id, game: gameDoc._id, contest: contest._id });
      if (!entry) {
        return res.status(403).json({ message: 'Entry fee not paid for this contest' });
      }
    } else if (sessionDoc && sessionDoc.entryFee > 0 && sessionPeriod) {
      const entry = await GameEntry.findOne({ user: req.user._id, game: gameDoc._id, session: sessionDoc._id, periodStart: sessionPeriod.start });
      if (!entry) {
        return res.status(403).json({ message: 'Entry fee not paid for this session period' });
      }
    }

    // ── Best-score logic ──
    let periodStart = null;
    let periodEnd = null;
    let existingQuery = { user: req.user._id, game };

    if (contest) {
      existingQuery.contest = contest._id;
    } else if (sessionDoc && sessionPeriod) {
      periodStart = sessionPeriod.start;
      periodEnd = sessionPeriod.end;
      const latest = await GameScore.findOne({ user: req.user._id, game, session: sessionDoc._id, periodStart });
      if (latest) {
        existingQuery = { _id: latest._id };
      } else {
        existingQuery = { _id: null }; // won't match — will create new
      }
    }

    const existing = await GameScore.findOne(existingQuery);

    let gameScore;
    let isNewBest = false;

    if (!existing) {
      gameScore = await GameScore.create({
        user: req.user._id,
        game,
        contest: contest?._id || null,
        session: sessionDoc?._id || null,
        contestId: contest ? String(contest._id) : null,
        contestStart: contest?.startDate || null,
        contestEnd: contest?.endDate || null,
        periodStart,
        points,
        time: Math.round(time),
        score,
        totalPlays: 1,
      });
      isNewBest = true;
    } else if (score > existing.score) {
      existing.points = points;
      existing.time = Math.round(time);
      existing.score = score;
      existing.totalPlays = (existing.totalPlays || 1) + 1;
      gameScore = await existing.save();
      isNewBest = true;
    } else {
      existing.totalPlays = (existing.totalPlays || 1) + 1;
      gameScore = await existing.save();
    }

    // ── Wallet credit for SESSION (rewarding) games ONLY ──
    // Contest (competition) scores NEVER get real-time wallet credits.
    // Contest prizes are distributed at the end via competitionController.
    let walletCredited = false;
    let actualEarnedDelta = 0;
    try {
      if (!contest && sessionDoc && sessionDoc.conversionRate > 0) {
        const rate = Number(sessionDoc.conversionRate);
        const earnedPkr = parseFloat((Number(score) / rate).toFixed(2));

        let scheduleId = '';
        if (periodStart) {
          scheduleId = `${sessionDoc._id}_${periodStart.toISOString()}`;
        }

        if (earnedPkr > 0) {
          const prevBalance = (await require('../models/Wallet').findOne({ user: req.user._id }))?.balance || 0;
          const newBalance = await creditRewardingGame(
            req.user._id,
            gameDoc.name || game,
            earnedPkr,
            scheduleId,
            periodEnd
          );
          actualEarnedDelta = parseFloat((newBalance - prevBalance).toFixed(2));
          walletCredited = actualEarnedDelta > 0;
        }
      }
    } catch (walletErr) {
      console.error('Wallet auto-credit error:', walletErr.message);
    }

    if (walletCredited && actualEarnedDelta > 0) {
      try {
        await creditReferralBonus(req.user._id, gameDoc.name || game, actualEarnedDelta);
      } catch (refErr) {
        console.error('Referral bonus error:', refErr.message);
      }
    }

    // ── Calculate rank ──
    const rankMatch = { game };
    if (contest) rankMatch.contest = contest._id;
    if (sessionDoc) rankMatch.session = sessionDoc._id;
    if (periodStart) rankMatch.periodStart = periodStart;
    const higherUsers = await GameScore.aggregate([
      { $match: rankMatch },
      { $group: { _id: '$user', best: { $max: '$score' } } },
      { $match: { best: { $gt: gameScore.score } } },
      { $count: 'above' }
    ]);
    const rank = (higherUsers[0]?.above || 0) + 1;

    let periodEndsAt = null;
    if (sessionPeriod) periodEndsAt = sessionPeriod.end;

    res.status(isNewBest ? 201 : 200).json({
      ...gameScore.toObject(),
      rank,
      isNewBest,
      walletCredited,
      periodEndsAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leaderboard for a specific game
// @route   GET /api/scores/leaderboard/:game
// @access  Public
const getLeaderboard = async (req, res) => {
  try {
    const { game } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const contestParam = req.query.contestId || null;
    const sessionParam = req.query.sessionId || null;
    const periodStartParam = req.query.periodStart || null;

    const gameDoc = await Game.findOne({ slug: game });

    // Resolve contest
    let contest = null;
    if (contestParam) {
      contest = await Contest.findById(contestParam).catch(() => null);
    }

    // Resolve session
    let sessionDoc = null;
    if (sessionParam) {
      sessionDoc = await Session.findById(sessionParam).catch(() => null);
    }

    const matchFilter = { game };
    if (contest) {
      matchFilter.contest = contest._id;
    } else if (contestParam) {
      matchFilter.contestId = contestParam; // legacy fallback
    }
    if (sessionDoc) {
      matchFilter.session = sessionDoc._id;
    }
    if (periodStartParam) {
      matchFilter.periodStart = new Date(periodStartParam);
    }

    const leaderboard = await GameScore.aggregate([
      { $match: matchFilter },
      { $sort: { score: -1 } },
      {
        $group: {
          _id: '$user',
          bestScore: { $max: '$score' },
          bestPoints: { $first: '$points' },
          bestTime: { $first: '$time' },
          totalPlays: { $max: '$totalPlays' },
          lastPlayed: { $max: '$updatedAt' }
        }
      },
      { $sort: { bestScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          points: '$bestPoints',
          time: '$bestTime',
          score: '$bestScore',
          totalPlays: 1,
          lastPlayed: 1
        }
      }
    ]);

    const prizes = contest?.prizes || [];
    const conversionRate = sessionDoc?.conversionRate || 0;

    const ranked = leaderboard.map((entry, i) => {
      const rank = i + 1;
      let earnedPkr = 0;
      if (sessionDoc && conversionRate > 0) {
        earnedPkr = parseFloat((entry.score / conversionRate).toFixed(2));
      } else if (contest && prizes.length > 0) {
        earnedPkr = prizes[rank - 1] || 0;
      }
      return { rank, ...entry, earnedPkr };
    });

    res.json(ranked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged-in user's scores across all games
// @route   GET /api/scores/me
// @access  Private
const getMyScores = async (req, res) => {
  try {
    const scores = await GameScore.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: {
            game: '$game',
            contest: { $ifNull: ['$contest', '__none__'] },
            session: { $ifNull: ['$session', '__none__'] },
            periodStart: { $ifNull: ['$periodStart', '__none__'] },
          },
          game: { $first: '$game' },
          contest: { $first: '$contest' },
          session: { $first: '$session' },
          contestId: { $first: '$contestId' },
          contestStart: { $first: '$contestStart' },
          contestEnd: { $first: '$contestEnd' },
          periodStart: { $first: '$periodStart' },
          bestScore: { $max: '$score' },
          bestPoints: { $max: '$points' },
          totalPlays: { $max: '$totalPlays' },
          lastPlayed: { $max: '$updatedAt' },
        }
      },
      { $sort: { game: 1, contestStart: -1, periodStart: -1 } }
    ]);

    // Enrich with live/ended status
    const gameSlugs = [...new Set(scores.map(s => s.game).filter(Boolean))];
    try {
      const gameDocs = await Game.find({ slug: { $in: gameSlugs } }).lean();
      const gameMap = {};
      gameDocs.forEach(g => { gameMap[g.slug] = g; });

      // Gather contest and session IDs from scores
      const contestIds = scores.map(s => s.contest).filter(c => c && c !== '__none__');
      const sessionIds = scores.map(s => s.session).filter(s => s && s !== '__none__');

      const [contestDocs, sessionDocs] = await Promise.all([
        contestIds.length > 0 ? Contest.find({ _id: { $in: contestIds } }).lean() : [],
        sessionIds.length > 0 ? Session.find({ _id: { $in: sessionIds } }).lean() : [],
      ]);

      const contestMap = {};
      contestDocs.forEach(c => { contestMap[String(c._id)] = c; });
      const sessionMap = {};
      sessionDocs.forEach(s => { sessionMap[String(s._id)] = s; });

      const now = new Date();
      scores.forEach(s => {
        // Contest scores
        if (s.contest && s.contest !== '__none__') {
          const c = contestMap[String(s.contest)];
          if (c) {
            s.isLive = c.status === 'live';
            s.isEnded = ['ended', 'distributed', 'cancelled'].includes(c.status);
            s.isCurrent = c.status === 'live' || c.status === 'scheduled';
          }
        }
        // Session scores
        if (s.session && s.session !== '__none__' && s.periodStart) {
          const sess = sessionMap[String(s.session)];
          if (sess) {
            const period = getSessionPeriod(sess);
            if (period) {
              const periodMs = period.periodMs;
              s.periodEnd = new Date(new Date(s.periodStart).getTime() + periodMs);
              s.isLive = now < s.periodEnd;
              s.isEnded = !s.isLive;
            }
          }
        }
      });
    } catch (_) {
      // isLive/isEnded will be undefined — frontend handles gracefully
    }

    res.json(scores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged-in user's scores for a specific game
// @route   GET /api/scores/me/:game
// @access  Private
const getMyGameScores = async (req, res) => {
  try {
    const { game } = req.params;
    const contestParam = req.query.contestId || null;
    const sessionParam = req.query.sessionId || null;
    const periodStart = req.query.periodStart || null;

    const gameDoc = await Game.findOne({ slug: game });

    // Resolve contest
    let contest = null;
    if (contestParam) {
      contest = await Contest.findById(contestParam).catch(() => null);
    }

    // Resolve session
    let sessionDoc = null;
    if (sessionParam) {
      sessionDoc = await Session.findById(sessionParam).catch(() => null);
    }

    const query = { user: req.user._id, game };
    if (contest) query.contest = contest._id;
    else if (contestParam) query.contestId = contestParam;
    if (sessionDoc) query.session = sessionDoc._id;
    if (periodStart) query.periodStart = new Date(periodStart);

    const record = await GameScore.findOne(query);
    const bestScore = record ? record.score : 0;

    const rankMatch = { game };
    if (contest) rankMatch.contest = contest._id;
    else if (contestParam) rankMatch.contestId = contestParam;
    if (sessionDoc) rankMatch.session = sessionDoc._id;
    if (periodStart) rankMatch.periodStart = new Date(periodStart);

    const higherUsers = await GameScore.aggregate([
      { $match: rankMatch },
      { $group: { _id: '$user', best: { $max: '$score' } } },
      { $match: { best: { $gt: bestScore } } },
      { $count: 'above' }
    ]);

    const rank = (higherUsers[0]?.above || 0) + 1;

    let earnedPkr = 0;
    const prizes = contest?.prizes || [];
    if (sessionDoc && sessionDoc.conversionRate > 0) {
      earnedPkr = parseFloat((bestScore / Number(sessionDoc.conversionRate)).toFixed(2));
    } else if (contest && prizes.length > 0) {
      earnedPkr = prizes[rank - 1] || 0;
    }

    res.json({
      rank,
      totalPlays: record?.totalPlays || 0,
      bestScore,
      earnedPkr,
      record: record || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contest history for a game
// @route   GET /api/scores/contests/:game
// @access  Public
const getContests = async (req, res) => {
  try {
    const { game } = req.params;
    const gameDoc = await Game.findOne({ slug: game });
    if (!gameDoc) return res.json([]);

    const contestDocs = await Contest.find({ game: gameDoc._id })
      .sort({ startDate: -1 })
      .lean();

    const results = await Promise.all(contestDocs.map(async (c) => {
      const stats = await GameScore.aggregate([
        { $match: { game, contest: c._id } },
        {
          $group: {
            _id: null,
            players: { $addToSet: '$user' },
            topScore: { $max: '$score' },
          }
        },
      ]);

      return {
        contestId: String(c._id),
        _id: c._id,
        contestStart: c.startDate,
        contestEnd: c.endDate,
        status: c.status,
        entryFee: c.entryFee,
        prizes: c.prizes,
        name: c.name || '',
        playerCount: stats[0]?.players?.length || 0,
        topScore: stats[0]?.topScore || 0,
        isLive: c.status === 'live',
        isEnded: ['ended', 'distributed', 'cancelled'].includes(c.status),
        prizesDistributed: c.prizesDistributed,
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin contest/session summary across all games
// @route   GET /api/scores/admin/contest-summary
// @access  Private/Admin
const getAdminContestSummary = async (req, res) => {
  try {
    // ── 1. Contest rows ──
    const allContests = await Contest.find({}).sort({ startDate: -1 }).lean();
    const contestGameIds = [...new Set(allContests.map(c => String(c.game)))];

    const contestGames = await Game.find({ _id: { $in: contestGameIds } })
      .select('slug name')
      .lean();
    const compGameMap = {};
    contestGames.forEach(g => { compGameMap[String(g._id)] = g; });

    const contestRows = await Promise.all(allContests.map(async (c) => {
      const gDoc = compGameMap[String(c.game)];
      if (!gDoc) return null;

      const topScores = await GameScore.aggregate([
        { $match: { game: gDoc.slug, contest: c._id } },
        { $sort: { score: -1 } },
        { $group: { _id: '$user', bestScore: { $max: '$score' } } },
        { $sort: { bestScore: -1 } },
        { $limit: 10 },
      ]);

      return {
        game: gDoc.slug,
        gameName: gDoc.name,
        contestId: String(c._id),
        contestStart: c.startDate,
        contestEnd: c.endDate,
        status: c.status,
        isLive: c.status === 'live',
        isEnded: ['ended', 'distributed', 'cancelled'].includes(c.status),
        isRewarding: false,
        prizes: c.prizes,
        entryFee: c.entryFee,
        name: c.name || '',
        winners: topScores.map((s, idx) => ({
          userId: s._id,
          score: s.bestScore,
          rank: idx + 1,
          earnedPkr: (c.prizes && c.prizes[idx]) || 0,
        })),
      };
    }));

    // ── 2. Session rows ──
    const allSessions = await Session.find({}).sort({ createdAt: -1 }).lean();
    const sessionGameIds = [...new Set(allSessions.map(s => String(s.game)))];
    const sessionGames = await Game.find({ _id: { $in: sessionGameIds } })
      .select('slug name')
      .lean();
    const sessGameMap = {};
    sessionGames.forEach(g => { sessGameMap[String(g._id)] = g; });

    // Get session scores grouped by session + periodStart
    const sessionSlugs = sessionGames.map(g => g.slug);
    const sessionRows = sessionSlugs.length > 0 ? await GameScore.aggregate([
      { $match: { game: { $in: sessionSlugs }, session: { $ne: null } } },
      {
        $group: {
          _id: { game: '$game', session: '$session', periodStart: { $ifNull: ['$periodStart', '__none__'] }, user: '$user' },
          bestScore: { $max: '$score' },
        }
      },
      { $sort: { '_id.game': 1, '_id.periodStart': -1, bestScore: -1 } },
      {
        $group: {
          _id: { game: '$_id.game', session: '$_id.session', periodStart: '$_id.periodStart' },
          winners: {
            $push: {
              userId: '$_id.user',
              score: '$bestScore',
            }
          },
        }
      },
      {
        $project: {
          _id: 0,
          game: '$_id.game',
          session: '$_id.session',
          periodStart: '$_id.periodStart',
          winners: { $slice: ['$winners', 10] },
        }
      },
      { $sort: { game: 1, periodStart: -1 } },
    ]) : [];

    // Build session map for enrichment
    const sessMap = {};
    allSessions.forEach(s => { sessMap[String(s._id)] = s; });

    const now = new Date();
    const sessionResult = sessionRows.map((row) => {
      const sess = sessMap[String(row.session)];
      const gDoc = sess ? sessGameMap[String(sess.game)] : null;
      const hasPeriod = row.periodStart && row.periodStart !== '__none__';
      let periodEnd = null;
      let isActive = false;

      if (hasPeriod && sess) {
        const period = getSessionPeriod(sess);
        if (period) {
          periodEnd = new Date(new Date(row.periodStart).getTime() + period.periodMs);
          isActive = now < periodEnd;
        }
      }

      const enrichedWinners = (row.winners || []).map((w, idx) => {
        let earnedPkr = 0;
        if (sess && sess.conversionRate > 0) {
          earnedPkr = parseFloat((w.score / Number(sess.conversionRate)).toFixed(2));
        }
        return {
          rank: idx + 1,
          userId: w.userId,
          score: w.score,
          earnedPkr,
        };
      });

      return {
        game: gDoc?.slug || row.game,
        gameName: gDoc?.name || row.game,
        sessionId: String(row.session),
        sessionName: sess?.name || '',
        contestId: null,
        contestStart: null,
        contestEnd: null,
        periodStart: hasPeriod ? row.periodStart : null,
        periodEnd: periodEnd ? periodEnd.toISOString() : null,
        isLive: isActive,
        isEnded: hasPeriod ? !isActive : false,
        isRewarding: true,
        winners: enrichedWinners,
      };
    });

    // ── 3. Gather user info ──
    const allUserIds = [...new Set([
      ...contestRows.filter(Boolean).flatMap(r => r.winners.map(w => String(w.userId))),
      ...sessionResult.flatMap(r => r.winners.map(w => String(w.userId))),
    ])];
    const userDocs = await User.find({ _id: { $in: allUserIds } }).select('_id name').lean();
    const userMap = {};
    userDocs.forEach(u => { userMap[String(u._id)] = u; });

    // Enrich all winners with names
    const competitiveResult = contestRows.filter(Boolean).map(row => ({
      ...row,
      winners: row.winners.map(w => ({
        ...w,
        name: userMap[String(w.userId)]?.name || 'Unknown',
      })),
    }));

    const enrichedSessionResult = sessionResult.map(row => ({
      ...row,
      winners: row.winners.map(w => ({
        ...w,
        name: userMap[String(w.userId)]?.name || 'Unknown',
      })),
    }));

    res.json([...enrichedSessionResult, ...competitiveResult]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get remaining session period time
// @route   GET /api/scores/period-remaining/:gameSlug
// @access  Public
const getPeriodRemaining = async (req, res) => {
  try {
    const { gameSlug } = req.params;
    const sessionParam = req.query.sessionId || null;

    if (!sessionParam) {
      // Return period info for all active sessions of this game
      const gameDoc = await Game.findOne({ slug: gameSlug });
      if (!gameDoc) return res.status(404).json({ message: 'Game not found' });

      const activeSessions = await Session.find({ game: gameDoc._id, isActive: true }).lean();
      if (activeSessions.length === 0) return res.json({ hasPeriod: false });

      const results = activeSessions.map(sess => {
        const period = getSessionPeriod(sess);
        if (!period) return { sessionId: sess._id, sessionName: sess.name, hasPeriod: false };
        const remaining = Math.max(0, period.end.getTime() - Date.now());
        return {
          sessionId: sess._id,
          sessionName: sess.name,
          hasPeriod: true,
          periodMs: period.periodMs,
          periodEndsAt: period.end,
          remaining,
        };
      });
      return res.json({ sessions: results });
    }

    const sessionDoc = await Session.findById(sessionParam);
    if (!sessionDoc) return res.status(404).json({ message: 'Session not found' });

    const period = getSessionPeriod(sessionDoc);
    if (!period) return res.json({ hasPeriod: false });

    const remaining = Math.max(0, period.end.getTime() - Date.now());
    return res.json({
      hasPeriod: true,
      sessionId: sessionDoc._id,
      sessionName: sessionDoc.name,
      periodMs: period.periodMs,
      periodEndsAt: period.end,
      remaining,
      periodAnchor: sessionDoc.periodAnchor,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get session periods (like getContests for competitive)
// @route   GET /api/scores/reward-periods/:game
// @access  Public
const getRewardingPeriods = async (req, res) => {
  try {
    const { game } = req.params;
    const sessionParam = req.query.sessionId || null;
    const gameDoc = await Game.findOne({ slug: game });
    if (!gameDoc) return res.json([]);

    const matchFilter = { game, session: { $ne: null } };
    if (sessionParam) {
      const sess = await Session.findById(sessionParam).catch(() => null);
      if (!sess) return res.json([]);
      matchFilter.session = sess._id;
    }

    const periods = await GameScore.aggregate([
      { $match: { ...matchFilter, periodStart: { $ne: null } } },
      {
        $group: {
          _id: { session: '$session', periodStart: '$periodStart' },
          players: { $addToSet: '$user' },
          topScore: { $max: '$score' },
        }
      },
      {
        $project: {
          _id: 0,
          session: '$_id.session',
          periodStart: '$_id.periodStart',
          playerCount: { $size: '$players' },
          topScore: 1,
        }
      },
      { $sort: { periodStart: -1 } },
    ]);

    // Enrich with session info
    const sessionIds = [...new Set(periods.map(p => String(p.session)))];
    const sessionDocs = await Session.find({ _id: { $in: sessionIds } }).lean();
    const sessMap = {};
    sessionDocs.forEach(s => { sessMap[String(s._id)] = s; });

    const now = Date.now();
    periods.forEach(p => {
      const sess = sessMap[String(p.session)];
      if (sess) {
        const period = getSessionPeriod(sess);
        if (period) {
          const endMs = new Date(p.periodStart).getTime() + period.periodMs;
          p.periodEnd = new Date(endMs);
          p.isActive = now < endMs;
        }
        p.sessionName = sess.name;
      }
    });

    res.json(periods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  saveScore,
  getLeaderboard,
  getMyScores,
  getMyGameScores,
  getContests,
  getAdminContestSummary,
  getPeriodRemaining,
  getRewardingPeriods
};
