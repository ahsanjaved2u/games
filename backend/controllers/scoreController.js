const GameScore = require('../models/GameScore');
const Game = require('../models/Game');
const User = require('../models/User');
const GameEntry = require('../models/GameEntry');
const { autoCreditScore, creditRewardingGame } = require('./walletController');
const { creditReferralBonus } = require('./referralController');

// @desc    Save a game score
// @route   POST /api/scores
// @access  Private
const saveScore = async (req, res) => {
  try {
    const { game, points, time, score } = req.body;

    if (!game || points === undefined || time === undefined || score === undefined) {
      return res.status(400).json({ message: 'game, points, time, and score are required' });
    }

    // Fetch the game document (reused later for wallet credit)
    const gameDoc = await Game.findOne({ slug: game });

    // ── Entry fee gate ──
    if (gameDoc && gameDoc.entryFee > 0) {
      let pStart = null;
      if (gameDoc.gameType === 'competitive') {
        pStart = gameDoc.scheduleStart ? new Date(gameDoc.scheduleStart) : null;
      } else {
        const periodMs = ((gameDoc.rewardPeriodDays || 0) * 86400000)
                       + ((gameDoc.rewardPeriodHours || 0) * 3600000)
                       + ((gameDoc.rewardPeriodMinutes || 0) * 60000);
        if (periodMs > 0) {
          const anchor = gameDoc.periodAnchor ? new Date(gameDoc.periodAnchor).getTime() : 0;
          const elapsed = Date.now() - anchor;
          pStart = new Date(anchor + Math.floor(elapsed / periodMs) * periodMs);
        }
      }
      if (pStart) {
        const entry = await GameEntry.findOne({ user: req.user._id, game: gameDoc._id, periodStart: pStart });
        if (!entry) {
          return res.status(403).json({ message: 'Entry fee not paid for this contest' });
        }
      }
    }

    // Determine contest context for competitive games
    let contestId = null;
    let contestStart = null;
    let contestEnd = null;
    if (gameDoc && gameDoc.gameType === 'competitive' && gameDoc.scheduleStart) {
      // Use activeContestId (unique per schedule period) so that each new round
      // of the same game gets its own isolated leaderboard.
      // Fall back to scheduleStart ISO string for scores saved before this field existed.
      contestId = gameDoc.activeContestId || gameDoc.scheduleStart.toISOString();
      contestStart = gameDoc.scheduleStart;
      contestEnd = gameDoc.scheduleEnd;

      // Once prizes are distributed, this contest's leaderboard is frozen
      if (gameDoc.prizesDistributed) {
        return res.status(403).json({ message: 'This contest has ended and prizes have been distributed.' });
      }
    }

    // Best-score logic: only update if new score beats previous best
    // For rewarding games with a reward period, check if the period expired
    let periodStart = null;
    let existingQuery = { user: req.user._id, game, contestId };

    if (gameDoc && gameDoc.gameType === 'rewarding') {
      const periodMs = ((gameDoc.rewardPeriodDays || 0) * 86400000)
                     + ((gameDoc.rewardPeriodHours || 0) * 3600000)
                     + ((gameDoc.rewardPeriodMinutes || 0) * 60000);

      if (periodMs > 0) {
        // Global period: all players share the same period boundaries
        const now = Date.now();
        const anchor = gameDoc.periodAnchor ? new Date(gameDoc.periodAnchor).getTime() : 0;
        const elapsed = now - anchor;
        const currentPeriodStart = new Date(anchor + Math.floor(elapsed / periodMs) * periodMs);

        // Find existing record for this user in the current global period
        const latest = await GameScore.findOne({ user: req.user._id, game, periodStart: currentPeriodStart });

        if (latest) {
          // Still within the same global period — update existing
          existingQuery = { _id: latest._id };
          periodStart = currentPeriodStart;
        } else {
          // No record in current global period — create new
          periodStart = currentPeriodStart;
          existingQuery = { _id: null }; // won't match anything
        }
      }
    }

    const existing = await GameScore.findOne(existingQuery);

    let gameScore;
    let isNewBest = false;

    if (!existing) {
      // First play — create new record
      gameScore = await GameScore.create({
        user: req.user._id,
        game,
        contestId,
        contestStart,
        contestEnd,
        periodStart,
        points,
        time: Math.round(time),
        score,
        totalPlays: 1
      });
      isNewBest = true;
    } else if (score > existing.score) {
      // New best — update the existing record
      existing.points = points;
      existing.time = Math.round(time);
      existing.score = score;
      existing.totalPlays = (existing.totalPlays || 1) + 1;
      gameScore = await existing.save();
      isNewBest = true;
    } else {
      // Score not better — still increment play count
      existing.totalPlays = (existing.totalPlays || 1) + 1;
      gameScore = await existing.save();
    }

    // Credit wallet for rewarding games.
    // One transaction per player + game + schedule period (upsert to best score).
    // Competitive games handle payouts separately via the prize-distribution flow.
    let walletCredited = false;
    let actualEarnedDelta = 0;
    try {
      if (gameDoc && gameDoc.gameType === 'rewarding' && gameDoc.conversionRate > 0) {
        const rate = Number(gameDoc.conversionRate);
        const earnedPkr = parseFloat((Number(score) / rate).toFixed(2));

        // scheduleId ties the transaction to the current period/schedule.
        // For period-based rewarding games, use periodStart so each period gets its own transaction.
        let scheduleId = '';
        if (periodStart) {
          scheduleId = periodStart.toISOString();
        } else if (gameDoc.scheduleStart) {
          scheduleId = gameDoc.activeContestId || gameDoc.scheduleStart.toISOString();
        }

        if (earnedPkr > 0) {
          const prevBalance = (await require('../models/Wallet').findOne({ user: req.user._id }))?.balance || 0;
          const newBalance = await creditRewardingGame(
            req.user._id,
            gameDoc.name || game,
            earnedPkr,
            scheduleId
          );
          actualEarnedDelta = parseFloat((newBalance - prevBalance).toFixed(2));
          walletCredited = actualEarnedDelta > 0;
        }
      }
    } catch (walletErr) {
      // Don't fail the score save if wallet credit fails
      console.error('Wallet auto-credit error:', walletErr.message);
    }

    // Credit referral bonus ONLY on the actual delta earned (not the full score)
    if (walletCredited && actualEarnedDelta > 0) {
      try {
        await creditReferralBonus(req.user._id, gameDoc.name || game, actualEarnedDelta);
      } catch (refErr) {
        console.error('Referral bonus error:', refErr.message);
      }
    }

    // Calculate rank: count users whose best score is higher (contest/period-aware)
    const rankMatch = { game };
    if (contestId) rankMatch.contestId = contestId;
    if (periodStart) rankMatch.periodStart = periodStart;
    const higherUsers = await GameScore.aggregate([
      { $match: rankMatch },
      { $group: { _id: '$user', best: { $max: '$score' } } },
      { $match: { best: { $gt: gameScore.score } } },
      { $count: 'above' }
    ]);
    const rank = (higherUsers[0]?.above || 0) + 1;

    // Calculate periodEndsAt so frontend can show a countdown
    let periodEndsAt = null;
    if (periodStart && gameDoc && gameDoc.gameType === 'rewarding') {
      const pMs = ((gameDoc.rewardPeriodDays || 0) * 86400000)
               + ((gameDoc.rewardPeriodHours || 0) * 3600000)
               + ((gameDoc.rewardPeriodMinutes || 0) * 60000);
      if (pMs > 0) periodEndsAt = new Date(periodStart.getTime() + pMs);
    }

    res.status(isNewBest ? 201 : 200).json({
      ...gameScore.toObject(),
      rank,
      isNewBest,
      walletCredited,
      periodEndsAt
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
    let contestId = req.query.contestId || null;

    // For competitive games, auto-detect current contest if not specified
    const gameDoc = await Game.findOne({ slug: game });
    if (gameDoc && gameDoc.gameType === 'competitive' && gameDoc.scheduleStart) {
      if (!contestId) {
        // Prefer activeContestId (unique per round); fall back to scheduleStart ISO for old records
        const potentialId = gameDoc.activeContestId || gameDoc.scheduleStart.toISOString();
        const hasContestScores = await GameScore.exists({ game, contestId: potentialId });
        if (hasContestScores) {
          contestId = potentialId;
        } else {
          // Also check old-format contestId (scheduleStart only) for backward compat
          const legacyId = gameDoc.scheduleStart.toISOString();
          const hasLegacy = legacyId !== potentialId && await GameScore.exists({ game, contestId: legacyId });
          if (hasLegacy) contestId = legacyId;
        }
      }
    }

    const matchFilter = { game };
    if (contestId) matchFilter.contestId = contestId;

    // For rewarding games with periods, filter by periodStart if provided
    const periodStartParam = req.query.periodStart || null;
    if (gameDoc && gameDoc.gameType === 'rewarding' && periodStartParam) {
      matchFilter.periodStart = new Date(periodStartParam);
    }

    // Best score per user for this game (+ contest/period)
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

    const ranked = leaderboard.map((entry, i) => ({
      rank: i + 1,
      ...entry
    }));

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
          _id: { game: '$game', contestId: { $ifNull: ['$contestId', '__none__'] }, periodStart: { $ifNull: ['$periodStart', '__none__'] } },
          game: { $first: '$game' },
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

    // Mark isLive / isEnded for competitive contest entries
    const gameSlugs = [...new Set(scores.map(s => s.game).filter(Boolean))];

    // Enrich with isLive/isEnded — wrap in try/catch so a DB error here
    // never prevents scores from being returned
    try {
      const gameDocs = await Game.find({ slug: { $in: gameSlugs } });
      const gameMap = {};
      gameDocs.forEach(g => { gameMap[g.slug] = g; });

      const now = new Date();
      scores.forEach(s => {
        const gDoc = gameMap[s.game];
        if (!gDoc) return;
        if (gDoc.gameType === 'competitive' && s.contestId) {
          const activeId = gDoc.activeContestId || gDoc.scheduleStart?.toISOString();
          s.isLive = s.contestId === activeId && gDoc.isLive === true;
          s.isEnded = s.contestEnd ? now >= new Date(s.contestEnd) : s.contestId !== activeId;
        }
        if (gDoc.gameType === 'rewarding' && s.periodStart) {
          const periodMs = ((gDoc.rewardPeriodDays || 0) * 86400000)
                         + ((gDoc.rewardPeriodHours || 0) * 3600000)
                         + ((gDoc.rewardPeriodMinutes || 0) * 60000);
          if (periodMs > 0) {
            s.periodEnd = new Date(new Date(s.periodStart).getTime() + periodMs);
            s.isLive = now < s.periodEnd;
            s.isEnded = !s.isLive;
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
    let contestId = req.query.contestId || null;
    const periodStart = req.query.periodStart || null;

    // Auto-detect current contest for competitive games
    if (!contestId) {
      const gameDoc = await Game.findOne({ slug: game });
      if (gameDoc && gameDoc.gameType === 'competitive' && gameDoc.scheduleStart) {
        const potentialId = gameDoc.activeContestId || gameDoc.scheduleStart.toISOString();
        const hasContestScores = await GameScore.exists({ game, contestId: potentialId });
        if (hasContestScores) {
          contestId = potentialId;
        } else {
          const legacyId = gameDoc.scheduleStart.toISOString();
          const hasLegacy = legacyId !== potentialId && await GameScore.exists({ game, contestId: legacyId });
          if (hasLegacy) contestId = legacyId;
        }
      }
    }

    const query = { user: req.user._id, game };
    if (contestId) query.contestId = contestId;
    if (periodStart) query.periodStart = new Date(periodStart);

    const record = await GameScore.findOne(query);

    const bestScore = record ? record.score : 0;

    const rankMatch = { game };
    if (contestId) rankMatch.contestId = contestId;
    if (periodStart) rankMatch.periodStart = new Date(periodStart);

    const higherUsers = await GameScore.aggregate([
      { $match: rankMatch },
      { $group: { _id: '$user', best: { $max: '$score' } } },
      { $match: { best: { $gt: bestScore } } },
      { $count: 'above' }
    ]);

    const rank = (higherUsers[0]?.above || 0) + 1;

    res.json({
      rank,
      totalPlays: record?.totalPlays || 0,
      bestScore,
      record: record || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contest periods for a competitive game
// @route   GET /api/scores/contests/:game
// @access  Public
const getContests = async (req, res) => {
  try {
    const { game } = req.params;

    const contests = await GameScore.aggregate([
      { $match: { game, contestId: { $ne: null } } },
      {
        $group: {
          _id: '$contestId',
          contestStart: { $first: '$contestStart' },
          contestEnd: { $first: '$contestEnd' },
          players: { $addToSet: '$user' },
          topScore: { $max: '$score' },
        }
      },
      {
        $project: {
          _id: 0,
          contestId: '$_id',
          contestStart: 1,
          contestEnd: 1,
          playerCount: { $size: '$players' },
          topScore: 1,
        }
      },
      { $sort: { contestStart: -1 } },
    ]);

    // Mark which is the current active contest
    const gameDoc = await Game.findOne({ slug: game });
    // Prefer activeContestId; fall back to scheduleStart ISO for old game docs
    const currentContestId = gameDoc?.activeContestId || gameDoc?.scheduleStart?.toISOString() || null;
    const now = new Date();

    contests.forEach(c => {
      c.isCurrent = c.contestId === currentContestId;
      c.isLive = c.isCurrent && gameDoc?.isLive === true;
      // If contestEnd is stored, compare against now.
      // If no contestEnd but contest is not current, it must have ended already.
      c.isEnded = c.contestEnd ? now >= new Date(c.contestEnd) : !c.isCurrent;
    });

    res.json(contests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin contest summary across all games
// @route   GET /api/scores/admin/contest-summary
// @access  Private/Admin
const getAdminContestSummary = async (req, res) => {
  try {
    // ── 1. Competitive rows: one row per (game, contest) with top 10 ──
    const contestRows = await GameScore.aggregate([
      { $match: { contestId: { $ne: null } } },
      {
        $group: {
          _id: {
            game: '$game',
            contestId: '$contestId',
            user: '$user',
          },
          bestScore: { $max: '$score' },
          contestStart: { $first: '$contestStart' },
          contestEnd: { $first: '$contestEnd' },
        }
      },
      { $sort: { '_id.game': 1, '_id.contestId': 1, bestScore: -1 } },
      {
        $group: {
          _id: {
            game: '$_id.game',
            contestId: '$_id.contestId',
          },
          contestStart: { $first: '$contestStart' },
          contestEnd: { $first: '$contestEnd' },
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
          contestId: '$_id.contestId',
          contestStart: 1,
          contestEnd: 1,
          winners: { $slice: ['$winners', 10] },
        }
      },
      { $sort: { contestStart: -1 } },
    ]);

    // ── 2. Rewarding rows: one row per rewarding game with top 10 (no contestId) ──
    const rewardingGames = await Game.find({ gameType: 'rewarding' }).select('slug name').lean();
    const rewardingSlugs = rewardingGames.map(g => g.slug);

    const rewardingRows = rewardingSlugs.length > 0 ? await GameScore.aggregate([
      { $match: { game: { $in: rewardingSlugs }, $or: [{ contestId: null }, { contestId: { $exists: false } }, { contestId: '' }] } },
      {
        $group: {
          _id: { game: '$game', periodStart: { $ifNull: ['$periodStart', '__none__'] }, user: '$user' },
          bestScore: { $max: '$score' },
        }
      },
      { $sort: { '_id.game': 1, '_id.periodStart': -1, bestScore: -1 } },
      {
        $group: {
          _id: { game: '$_id.game', periodStart: '$_id.periodStart' },
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
          periodStart: '$_id.periodStart',
          winners: { $slice: ['$winners', 10] },
        }
      },
      { $sort: { game: 1, periodStart: -1 } },
    ]) : [];

    // ── 3. Gather all user/game info ──
    const allGameSlugs = [...new Set([...contestRows.map(r => r.game), ...rewardingRows.map(r => r.game)].filter(Boolean))];
    const allUserIds = [...new Set([...contestRows, ...rewardingRows].flatMap(r => (r.winners || []).map(w => String(w.userId))))];

    const [gameDocs, userDocs] = await Promise.all([
      Game.find({ slug: { $in: allGameSlugs } })
        .select('slug name isLive activeContestId scheduleStart gameType')
        .lean(),
      User.find({ _id: { $in: allUserIds } })
        .select('_id name')
        .lean(),
    ]);

    const gameMap = {};
    gameDocs.forEach(g => { gameMap[g.slug] = g; });

    const userMap = {};
    userDocs.forEach(u => { userMap[String(u._id)] = u; });

    const enrichWinners = (winners) => (winners || []).map((winner, idx) => {
      const user = userMap[String(winner.userId)];
      return { rank: idx + 1, userId: winner.userId, name: user?.name || 'Unknown', score: winner.score };
    });

    const now = new Date();

    // ── 4. Build competitive result ──
    const competitiveResult = contestRows.map((row) => {
      const gameDoc = gameMap[row.game];
      const currentContestId = gameDoc?.activeContestId || gameDoc?.scheduleStart?.toISOString() || null;
      const isCurrent = row.contestId === currentContestId;
      const isLive = isCurrent && gameDoc?.isLive === true;
      const isEnded = row.contestEnd ? now >= new Date(row.contestEnd) : !isCurrent;

      return {
        game: row.game,
        gameName: gameDoc?.name || row.game,
        contestId: row.contestId,
        contestStart: row.contestStart,
        contestEnd: row.contestEnd,
        isCurrent,
        isLive,
        isEnded,
        isRewarding: false,
        winners: enrichWinners(row.winners),
      };
    });

    // ── 5. Build rewarding result (one row per period) ──
    const rewardingResult = rewardingRows.map((row) => {
      const gameDoc = gameMap[row.game];
      const hasPeriod = row.periodStart && row.periodStart !== '__none__';
      let periodEnd = null;
      let isActive = false;
      if (hasPeriod && gameDoc) {
        const periodMs = ((gameDoc.rewardPeriodDays || 0) * 86400000)
                       + ((gameDoc.rewardPeriodHours || 0) * 3600000)
                       + ((gameDoc.rewardPeriodMinutes || 0) * 60000);
        if (periodMs > 0) {
          periodEnd = new Date(new Date(row.periodStart).getTime() + periodMs);
          isActive = now < periodEnd;
        }
      }
      return {
        game: row.game,
        gameName: gameDoc?.name || row.game,
        contestId: null,
        contestStart: null,
        contestEnd: null,
        periodStart: hasPeriod ? row.periodStart : null,
        periodEnd: periodEnd ? periodEnd.toISOString() : null,
        isCurrent: false,
        isLive: isActive,
        isEnded: hasPeriod ? !isActive : false,
        isRewarding: true,
        winners: enrichWinners(row.winners),
      };
    });

    // Rewarding first, then competitive
    res.json([...rewardingResult, ...competitiveResult]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get remaining reward-period time for a game (global periods)
// @route   GET /api/scores/period-remaining/:gameSlug
// @access  Public
const getPeriodRemaining = async (req, res) => {
  try {
    const { gameSlug } = req.params;
    const gameDoc = await Game.findOne({ slug: gameSlug });
    if (!gameDoc) return res.status(404).json({ message: 'Game not found' });

    if (gameDoc.gameType !== 'rewarding') {
      return res.json({ hasPeriod: false });
    }

    const periodMs = ((gameDoc.rewardPeriodDays || 0) * 86400000)
                   + ((gameDoc.rewardPeriodHours || 0) * 3600000)
                   + ((gameDoc.rewardPeriodMinutes || 0) * 60000);

    if (periodMs <= 0) {
      return res.json({ hasPeriod: false });
    }

    const now = Date.now();
    // Use periodAnchor for correct alignment
    const anchor = gameDoc.periodAnchor ? new Date(gameDoc.periodAnchor).getTime() : 0;
    const elapsed = now - anchor;
    const periodEndsAt = new Date(anchor + (Math.floor(elapsed / periodMs) + 1) * periodMs);
    const remaining = Math.max(0, periodEndsAt - now);

    return res.json({ hasPeriod: true, periodMs, periodEndsAt, remaining, periodAnchor: gameDoc.periodAnchor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reward periods for a rewarding game (like getContests for competitive)
// @route   GET /api/scores/reward-periods/:game
// @access  Public
const getRewardingPeriods = async (req, res) => {
  try {
    const { game } = req.params;
    const gameDoc = await Game.findOne({ slug: game });
    if (!gameDoc || gameDoc.gameType !== 'rewarding') {
      return res.json([]);
    }

    const periodMs = ((gameDoc.rewardPeriodDays || 0) * 86400000)
                   + ((gameDoc.rewardPeriodHours || 0) * 3600000)
                   + ((gameDoc.rewardPeriodMinutes || 0) * 60000);

    if (periodMs <= 0) return res.json([]);

    const periods = await GameScore.aggregate([
      { $match: { game, periodStart: { $ne: null } } },
      {
        $group: {
          _id: '$periodStart',
          players: { $addToSet: '$user' },
          topScore: { $max: '$score' },
        }
      },
      {
        $project: {
          _id: 0,
          periodStart: '$_id',
          playerCount: { $size: '$players' },
          topScore: 1,
        }
      },
      { $sort: { periodStart: -1 } },
    ]);

    const now = Date.now();
    periods.forEach(p => {
      const endMs = new Date(p.periodStart).getTime() + periodMs;
      p.periodEnd = new Date(endMs);
      p.isActive = now < endMs;
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
