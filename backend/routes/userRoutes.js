const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, updateProfile, getAdminProfileSummary, verifyEmail, resendCode } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', protect, verifyEmail);
router.post('/resend-code', protect, resendCode);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.get('/admin/profile-summary', protect, admin, getAdminProfileSummary);
router.get('/', protect, admin, getAllUsers);

module.exports = router;
