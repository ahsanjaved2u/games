const express = require('express');
const router = express.Router();
const { getLogs, getStats, cleanupLogs } = require('../controllers/logController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, getLogs);
router.get('/stats', protect, admin, getStats);
router.delete('/cleanup', protect, admin, cleanupLogs);

module.exports = router;
