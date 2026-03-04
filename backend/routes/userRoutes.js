const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, updateProfile } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.get('/', protect, admin, getAllUsers);

module.exports = router;
