const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getSessionsForGame,
  getActiveSessionsForGame,
  getSession,
  createSession,
  updateSession,
  deleteSession,
} = require('../controllers/sessionController');

// Public
router.get('/active/:gameId', getActiveSessionsForGame);
router.get('/:id', getSession);

// Admin
router.get('/game/:gameId', protect, admin, getSessionsForGame);
router.post('/', protect, admin, createSession);
router.put('/:id', protect, admin, updateSession);
router.delete('/:id', protect, admin, deleteSession);

module.exports = router;
