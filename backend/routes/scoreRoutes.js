const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  saveScore,
  getLeaderboard,
  getMyScores,
  getMyGameScores
} = require('../controllers/scoreController');

// Public
router.get('/leaderboard/:game', getLeaderboard);

// Private (need login)
router.post('/', protect, saveScore);
router.get('/me', protect, getMyScores);
router.get('/me/:game', protect, getMyGameScores);

module.exports = router;
