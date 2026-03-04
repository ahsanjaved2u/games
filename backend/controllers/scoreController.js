const GameScore = require('../models/GameScore');

// @desc    Save a game score
// @route   POST /api/scores
// @access  Private
const saveScore = async (req, res) => {
  try {
    const { game, points, time, score } = req.body;

    if (!game || points === undefined || time === undefined || score === undefined) {
      return res.status(400).json({ message: 'game, points, time, and score are required' });
    }

    // Best-score logic: only update if new score beats previous best
    const existing = await GameScore.findOne({ user: req.user._id, game });

    let gameScore;
    let isNewBest = false;

    if (!existing) {
      // First play — create new record
      gameScore = await GameScore.create({
        user: req.user._id,
        game,
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

    // Calculate rank: count users whose best score is higher
    const higherUsers = await GameScore.aggregate([
      { $match: { game } },
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

    // Best score per user for this game
    const leaderboard = await GameScore.aggregate([
      { $match: { game } },
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
          _id: '$game',
          bestScore: { $max: '$score' },
          bestPoints: { $max: '$points' },
          bestTime: { $min: '$time' },
          totalPlays: { $max: '$totalPlays' },
          lastPlayed: { $max: '$updatedAt' }
        }
      },
      { $sort: { lastPlayed: -1 } }
    ]);

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

    const record = await GameScore.findOne({ user: req.user._id, game });

    const bestScore = record ? record.score : 0;

    const higherUsers = await GameScore.aggregate([
      { $match: { game } },
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

module.exports = {
  saveScore,
  getLeaderboard,
  getMyScores,
  getMyGameScores
};
