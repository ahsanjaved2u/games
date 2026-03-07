const GameScore = require('../models/GameScore');
const Game = require('../models/Game');
const User = require('../models/User');
const { autoCreditScore } = require('./walletController');

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
    const existing = await GameScore.findOne({ user: req.user._id, game, contestId });

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

    // Auto-credit wallet for rewarding games on new best score
    if (isNewBest) {
      try {
        if (gameDoc && gameDoc.gameType === 'rewarding' && gameDoc.conversionRate > 0) {
          const earned = Math.floor(gameScore.score * gameDoc.conversionRate);
          if (earned > 0) {
            await autoCreditScore(req.user._id, game, gameDoc.name, earned);
          }
        }
      } catch (walletErr) {
        // Don't fail the score save if wallet credit fails
        console.error('Wallet auto-credit error:', walletErr.message);
      }
    }

    // Calculate rank: count users whose best score is higher (contest-aware)
    const rankMatch = { game };
    if (contestId) rankMatch.contestId = contestId;
    const higherUsers = await GameScore.aggregate([
      { $match: rankMatch },
      { $group: { _id: '$user', best: { $max: '$score' } } },
      { $match: { best: { $gt: gameScore.score } } },
      { $count: 'above' }
    ]);
    const rank = (higherUsers[0]?.above || 0) + 1;

    res.status(isNewBest ? 201 : 200).json({
      ...gameScore.toObject(),
      rank,
      isNewBest
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

    // Best score per user for this game (+ contest)
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
          _id: { game: '$game', contestId: { $ifNull: ['$contestId', '__none__'] } },
          game: { $first: '$game' },
          contestId: { $first: '$contestId' },
          contestStart: { $first: '$contestStart' },
          contestEnd: { $first: '$contestEnd' },
          bestScore: { $max: '$score' },
          bestPoints: { $max: '$points' },
          totalPlays: { $max: '$totalPlays' },
          lastPlayed: { $max: '$updatedAt' },
        }
      },
      { $sort: { game: 1, contestStart: -1 } }
    ]);

    // Mark isLive / isEnded for competitive contest entries
    const gameSlugs = [...new Set(scores.map(s => s.game).filter(Boolean))];

    // Enrich with isLive/isEnded — wrap in try/catch so a DB error here
    // never prevents scores from being returned
    try {
      const gameDocs = await Game.find({ slug: { $in: gameSlugs }, gameType: 'competitive' });
      const gameMap = {};
      gameDocs.forEach(g => { gameMap[g.slug] = g; });

      const now = new Date();
      scores.forEach(s => {
        const gDoc = gameMap[s.game];
        if (gDoc && s.contestId) {
          const activeId = gDoc.activeContestId || gDoc.scheduleStart?.toISOString();
          s.isLive = s.contestId === activeId && gDoc.isLive === true;
          s.isEnded = s.contestEnd ? now >= new Date(s.contestEnd) : s.contestId !== activeId;
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

    const record = await GameScore.findOne(query);

    const bestScore = record ? record.score : 0;

    const rankMatch = { game };
    if (contestId) rankMatch.contestId = contestId;

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
    // Build one row per (game, contest) with top 10 winners by best score.
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

    if (contestRows.length === 0) {
      return res.json([]);
    }

    const gameSlugs = [...new Set(contestRows.map(r => r.game).filter(Boolean))];
    const userIds = [...new Set(contestRows.flatMap(r => (r.winners || []).map(w => String(w.userId))))];

    const [gameDocs, userDocs] = await Promise.all([
      Game.find({ slug: { $in: gameSlugs } })
        .select('slug name isLive activeContestId scheduleStart')
        .lean(),
      User.find({ _id: { $in: userIds } })
        .select('_id name')
        .lean(),
    ]);

    const gameMap = {};
    gameDocs.forEach(g => { gameMap[g.slug] = g; });

    const userMap = {};
    userDocs.forEach(u => { userMap[String(u._id)] = u; });

    const now = new Date();

    const result = contestRows.map((row) => {
      const gameDoc = gameMap[row.game];
      const currentContestId = gameDoc?.activeContestId || gameDoc?.scheduleStart?.toISOString() || null;
      const isCurrent = row.contestId === currentContestId;
      const isLive = isCurrent && gameDoc?.isLive === true;
      const isEnded = row.contestEnd ? now >= new Date(row.contestEnd) : !isCurrent;

      const winners = (row.winners || []).map((winner, idx) => {
        const user = userMap[String(winner.userId)];
        return {
          rank: idx + 1,
          userId: winner.userId,
          name: user?.name || 'Unknown',
          score: winner.score,
        };
      });

      return {
        game: row.game,
        gameName: gameDoc?.name || row.game,
        contestId: row.contestId,
        contestStart: row.contestStart,
        contestEnd: row.contestEnd,
        isCurrent,
        isLive,
        isEnded,
        winners,
      };
    });

    res.json(result);
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
  getAdminContestSummary
};
