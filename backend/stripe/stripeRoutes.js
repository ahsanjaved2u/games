const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPaymentIntent,
  verifyAndCredit,
  getSavedCards,
  deleteSavedCard,
} = require('./stripeController');

// POST /api/stripe/topup  — create PaymentIntent, get clientSecret
router.post('/topup', protect, createPaymentIntent);

// POST /api/stripe/verify — verify payment success, credit wallet
router.post('/verify', protect, verifyAndCredit);

// GET  /api/stripe/saved-cards — list user's saved cards
router.get('/saved-cards', protect, getSavedCards);

// DELETE /api/stripe/saved-cards/:id — remove a saved card
router.delete('/saved-cards/:id', protect, deleteSavedCard);

module.exports = router;
