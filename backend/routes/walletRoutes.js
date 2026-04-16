const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getMyWallet,
  getMyBalance,
  requestWithdrawal,
  adminCredit,
  adminDebit,
  adminGetAllWallets,
  adminGetClaimableSummary,
  adminGetPlayerContestClaimableSummary,
  adminGetUserTransactions,
  adminGetAllTransactions,
  adminGetWithdrawals,
  adminHandleWithdrawal,
} = require('../controllers/walletController');

// ── Player routes ──
router.get('/balance', protect, getMyBalance);
router.post('/withdraw', protect, requestWithdrawal);

// ── Admin routes (must come before / to avoid conflict) ──
router.get('/admin/all', protect, admin, adminGetAllWallets);
router.get('/admin/claimable-summary', protect, admin, adminGetClaimableSummary);
router.get('/admin/claimable-summary/:userId/contests', protect, admin, adminGetPlayerContestClaimableSummary);
router.get('/admin/transactions', protect, admin, adminGetAllTransactions);
router.get('/admin/transactions/:userId', protect, admin, adminGetUserTransactions);
router.get('/admin/withdrawals', protect, admin, adminGetWithdrawals);
router.patch('/admin/withdrawals/:id', protect, admin, adminHandleWithdrawal);
router.post('/admin/credit', protect, admin, adminCredit);
router.post('/admin/debit', protect, admin, adminDebit);

// ── Player wallet (must be last) ──
router.get('/', protect, getMyWallet);

module.exports = router;
