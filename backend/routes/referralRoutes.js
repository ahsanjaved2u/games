const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getMyReferrals,
  getMyReferralEarnings,
  adminGetAllReferrals,
  adminUpdateReferralStatus,
  adminGetReferralStats,
} = require('../controllers/referralController');

// User routes
router.get('/my', protect, getMyReferrals);
router.get('/my/earnings', protect, getMyReferralEarnings);

// Admin routes
router.get('/admin/all', protect, admin, adminGetAllReferrals);
router.get('/admin/stats', protect, admin, adminGetReferralStats);
router.patch('/admin/:id/status', protect, admin, adminUpdateReferralStatus);

module.exports = router;
