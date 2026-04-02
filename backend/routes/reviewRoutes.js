const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  toggleLike,
  getLikes,
  getComments,
  addComment,
  editComment,
  deleteComment,
  reportComment,
  getMyComments,
  adminGetComments,
  adminDeleteComment,
  getGameReviewSummary,
  getBulkReviewSummary,
} = require('../controllers/reviewController');

// Optional auth — sets req.user if token present, otherwise continues
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch { /* ignore — treat as anonymous */ }
  }
  next();
};

// ── Bulk summary (must be before /:slug routes) ──
router.post('/bulk-summary', optionalAuth, getBulkReviewSummary);

// ── My comments ──
router.get('/my-comments', protect, getMyComments);

// ── Admin ──
router.get('/admin/comments', protect, admin, adminGetComments);
router.delete('/admin/comments/:commentId', protect, admin, adminDeleteComment);

// ── Comment CRUD (by commentId — before /:slug) ──
router.put('/comments/:commentId', protect, editComment);
router.delete('/comments/:commentId', protect, deleteComment);
router.post('/comments/:commentId/report', protect, reportComment);

// ── Game-scoped (by slug) ──
router.post('/:slug/like', protect, toggleLike);
router.get('/:slug/likes', optionalAuth, getLikes);
router.get('/:slug/comments', optionalAuth, getComments);
router.post('/:slug/comments', protect, addComment);
router.get('/:slug/summary', optionalAuth, getGameReviewSummary);

module.exports = router;
