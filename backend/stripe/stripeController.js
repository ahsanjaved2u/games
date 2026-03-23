const stripe = require('./stripeClient');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });
  return wallet;
};

// ── Get or create a Stripe Customer for the user ────────────────────────────
const getOrCreateStripeCustomer = async (user) => {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user._id.toString() },
  });

  user.stripeCustomerId = customer.id;
  await User.updateOne({ _id: user._id }, { stripeCustomerId: customer.id });
  return customer.id;
};

// ── POST /api/stripe/topup ──────────────────────────────────────────────────
// Creates a Stripe PaymentIntent and returns the clientSecret to the frontend.
// If saveCard is true, attaches the payment to a Stripe Customer so the card
// can be reused later.
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, saveCard, paymentMethodId } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ message: 'Minimum top-up is PKR 50' });
    }

    const customerId = await getOrCreateStripeCustomer(req.user);

    // ── Pay with a saved card ──
    if (paymentMethodId) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'pkr',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: false,
        confirm: true,
        metadata: { userId: req.user._id.toString() },
      });

      return res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      });
    }

    // ── New card payment ──
    const intentParams = {
      amount: Math.round(amount * 100),
      currency: 'pkr',
      customer: customerId,
      metadata: { userId: req.user._id.toString() },
    };

    if (saveCard) {
      intentParams.setup_future_usage = 'off_session';
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/stripe/verify ─────────────────────────────────────────────────
// Called after frontend confirms the payment. Verifies with Stripe and credits
// the player's wallet. Idempotent — duplicate calls with the same paymentIntentId
// are safe and will not double-credit.
const verifyAndCredit = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: 'paymentIntentId is required' });
    }

    // Idempotency check — don't credit twice for the same PaymentIntent
    const existing = await Transaction.findOne({
      user: req.user._id,
      note: paymentIntentId,
    });
    if (existing) {
      const wallet = await getOrCreateWallet(req.user._id);
      return res.json({
        success: true,
        balance: wallet.balance,
        amount: existing.amount,
        alreadyCredited: true,
      });
    }

    // Verify with Stripe that payment actually succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Ensure the PaymentIntent belongs to the requesting user
    if (paymentIntent.metadata.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const amountPKR = paymentIntent.amount / 100;

    // Credit wallet
    const wallet = await getOrCreateWallet(req.user._id);
    wallet.balance += amountPKR;
    await wallet.save();

    // Record transaction — note field stores paymentIntentId for idempotency
    await Transaction.create({
      user: req.user._id,
      type: 'credit',
      amount: amountPKR,
      description: 'Card top-up via Stripe',
      status: 'completed',
      note: paymentIntentId,
    });

    res.json({ success: true, balance: wallet.balance, amount: amountPKR });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/stripe/saved-cards ─────────────────────────────────────────────
// Returns the user's saved payment methods (cards).
const getSavedCards = async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) {
      return res.json({ cards: [] });
    }

    const methods = await stripe.paymentMethods.list({
      customer: req.user.stripeCustomerId,
      type: 'card',
    });

    const cards = methods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    }));

    res.json({ cards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/stripe/saved-cards/:id ──────────────────────────────────────
// Detaches a saved payment method from the customer.
const deleteSavedCard = async (req, res) => {
  try {
    const { id } = req.params;
    await stripe.paymentMethods.detach(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createPaymentIntent,
  verifyAndCredit,
  getSavedCards,
  deleteSavedCard,
};
