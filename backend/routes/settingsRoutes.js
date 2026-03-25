const express = require('express');
const router = express.Router();
const { getPublicSettings, getAllSettings, updateSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

// Public route — anyone can read signup reward etc.
router.get('/public', getPublicSettings);

// Admin routes
router.get('/', protect, admin, getAllSettings);
router.put('/', protect, admin, updateSettings);

module.exports = router;
