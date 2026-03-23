const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkEntry, payEntry, payAttempt } = require('../controllers/entryController');

// Both routes require authentication
router.get('/:slug/status', protect, checkEntry);
router.post('/:slug/pay', protect, payEntry);
router.post('/:slug/pay-attempt', protect, payAttempt);

module.exports = router;
