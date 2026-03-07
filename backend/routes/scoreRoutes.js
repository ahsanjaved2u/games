const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  saveScore,
  getLeaderboard,
  getMyScores,
  getMyGameScores,
  getContests,
  getAdminContestSummary
} = require('../controllers/scoreController');

// Public
router.get('/leaderboard/:game', getLeaderboard);
router.get('/contests/:game', getContests);

// Private (need login)
router.post('/', protect, saveScore);
router.get('/me', protect, getMyScores);
router.get('/me/:game', protect, getMyGameScores);
router.get('/admin/contest-summary', protect, admin, getAdminContestSummary);

module.exports = router;
