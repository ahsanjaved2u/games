const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, updateProfile, getAdminProfileSummary, verifyEmail, resendCode, adminVerifyUser, adminBlockUser, adminDeleteUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');
const { addClient } = require('../utils/sse');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', protect, verifyEmail);
router.post('/resend-code', protect, resendCode);
router.get('/me', protect, getMe);

// SSE stream — pushes real-time events (block, verify, delete) to the logged-in user
// EventSource can't send headers, so accept token as query param and set the header
router.get('/me/stream', (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, protect, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write(':\n\n');
  addClient(req.user._id.toString(), res);
});
router.put('/me', protect, updateProfile);
router.get('/admin/profile-summary', protect, admin, getAdminProfileSummary);
router.patch('/:id/verify', protect, admin, adminVerifyUser);
router.patch('/:id/block', protect, admin, adminBlockUser);
router.delete('/:id', protect, admin, adminDeleteUser);
router.get('/', protect, admin, getAllUsers);

module.exports = router;
