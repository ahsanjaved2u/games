const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getContestsForGame,
  getContest,
  createContest,
  updateContest,
  cancelContest,
  getActiveContest,
} = require('../controllers/contestController');

// ── Public ──
router.get('/active/:slug', getActiveContest);
router.get('/:id', getContest);

// ── Admin ──
router.get('/game/:gameId', protect, admin, getContestsForGame);
router.post('/', protect, admin, createContest);
router.put('/:id', protect, admin, updateContest);
router.patch('/:id/cancel', protect, admin, cancelContest);

module.exports = router;
