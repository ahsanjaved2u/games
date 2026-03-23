const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Game = require('../models/Game');
const GameScore = require('../models/GameScore');
const { sendWithdrawalRequestToAdmin, sendWithdrawalApprovedToPlayer, sendWithdrawalRejectedToPlayer } = require('../utils/mailer');

const safeIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const isValidObjectIdLike = (value) => {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
};

// ── Helper: get or create wallet ──
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });
  return wallet;
};

// ────────────────────────────────────────
// @desc    Get own wallet balance + recent transactions
// @route   GET /api/wallet
// @access  Private
// ────────────────────────────────────────
const getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'name');

    // All-time financial summary for profile/analytics cards.
    const [wonAgg, redeemedAgg] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'credit',
            status: { $in: ['completed', 'pending'] },
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            $or: [
              { type: 'debit', status: { $in: ['completed', 'pending'] } },
              { type: 'withdrawal', status: { $in: ['completed', 'pending'] } },
            ],
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    const wonAmount = Number(wonAgg[0]?.total || 0);
    const redeemedAmount = Number(redeemedAgg[0]?.total || 0);

    res.json({
      balance: wallet.balance,
      transactions,
      summary: {
        wonAmount,
        redeemedAmount,
        balanceAmount: Number(wallet.balance || 0),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Get just the balance (lightweight, for navbar)
// @route   GET /api/wallet/balance
// @access  Private
// ────────────────────────────────────────
const getMyBalance = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);
    res.json({ balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Player requests a withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
// ────────────────────────────────────────
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, note, paymentMethod } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    if (!paymentMethod || !paymentMethod.method) return res.status(400).json({ message: 'Payment method is required' });

    const wallet = await getOrCreateWallet(req.user._id);
    if (wallet.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    // Deduct immediately, mark as pending
    wallet.balance -= amount;
    await wallet.save();

    const txn = await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      description: 'Withdrawal request',
      status: 'pending',
      note: note || '',
      paymentMethod: {
        method: paymentMethod.method,
        bankName: paymentMethod.bankName || '',
        accountTitle: paymentMethod.accountTitle || '',
        accountNumber: paymentMethod.accountNumber || '',
        phoneNumber: paymentMethod.phoneNumber || '',
        cardHolderName: paymentMethod.cardHolderName || '',
        cardNumber: paymentMethod.cardNumber || '',
      },
    });

    // Fire-and-forget email to admin
    sendWithdrawalRequestToAdmin(req.user, amount, paymentMethod, note);

    res.status(201).json({ message: 'Withdrawal requested', balance: wallet.balance, transaction: txn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: credit a player
// @route   POST /api/wallet/admin/credit
// @access  Private/Admin
// ────────────────────────────────────────
const adminCredit = async (req, res) => {
  try {
    const { userId, amount, description, game } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ message: 'userId and positive amount required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const wallet = await getOrCreateWallet(userId);
    wallet.balance += amount;
    await wallet.save();

    const txn = await Transaction.create({
      user: userId,
      type: 'credit',
      amount,
      description: description || 'Admin credit',
      game: game || '',
      status: 'completed',
      createdBy: req.user._id,
    });

    res.json({ message: `PKR ${amount} credited`, balance: wallet.balance, transaction: txn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: debit a player
// @route   POST /api/wallet/admin/debit
// @access  Private/Admin
// ────────────────────────────────────────
const adminDebit = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ message: 'userId and positive amount required' });

    const wallet = await getOrCreateWallet(userId);
    if (wallet.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    wallet.balance -= amount;
    await wallet.save();

    const txn = await Transaction.create({
      user: userId,
      type: 'debit',
      amount,
      description: description || 'Admin debit',
      status: 'completed',
      createdBy: req.user._id,
    });

    res.json({ message: `PKR ${amount} debited`, balance: wallet.balance, transaction: txn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: get all wallets with user info
// @route   GET /api/wallet/admin/all
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetAllWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find()
      .populate('user', 'name email role')
      .sort({ balance: -1 });
    res.json(wallets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: claimable summary across all players
// @route   GET /api/wallet/admin/claimable-summary
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetClaimableSummary = async (req, res) => {
  try {
    const wallets = await Wallet.find()
      .populate('user', 'name email role')
      .lean();

    // Admin is not treated as a player in this report.
    const playerWallets = wallets.filter(w => w.user && w.user.role !== 'admin');
    const userIds = playerWallets.map(w => w.user?._id).filter(Boolean);

    if (userIds.length === 0) {
      return res.json({
        totalClaimable: 0,
        rows: [],
        totals: {
          wonAmount: 0,
          redeemedAmount: 0,
          balanceAmount: 0,
        },
      });
    }

    // Total won = all credit transactions.
    const wonAgg = await Transaction.aggregate([
      {
        $match: {
          user: { $in: userIds },
          type: 'credit',
          status: { $in: ['completed', 'pending'] },
        }
      },
      { $group: { _id: '$user', total: { $sum: '$amount' } } }
    ]);

    // Redeemed/paid = debits + non-rejected withdrawals.
    const redeemedAgg = await Transaction.aggregate([
      {
        $match: {
          user: { $in: userIds },
          $or: [
            { type: 'debit', status: { $in: ['completed', 'pending'] } },
            { type: 'withdrawal', status: { $in: ['completed', 'pending'] } },
          ],
        }
      },
      { $group: { _id: '$user', total: { $sum: '$amount' } } }
    ]);

    // Pending withdrawals — already deducted from wallet but not yet paid by admin.
    // Add them back so admin sees the true amount still owed.
    const pendingAgg = await Transaction.aggregate([
      {
        $match: {
          user: { $in: userIds },
          type: 'withdrawal',
          status: 'pending',
        }
      },
      { $group: { _id: '$user', total: { $sum: '$amount' } } }
    ]);

    const wonMap = new Map(wonAgg.map(x => [String(x._id), Number(x.total || 0)]));
    const redeemedMap = new Map(redeemedAgg.map(x => [String(x._id), Number(x.total || 0)]));
    const pendingMap = new Map(pendingAgg.map(x => [String(x._id), Number(x.total || 0)]));

    const rows = playerWallets.map((wallet) => {
      const userId = String(wallet.user._id);
      const wonAmount = wonMap.get(userId) || 0;
      const redeemedAmount = redeemedMap.get(userId) || 0;
      const pendingWithdrawals = pendingMap.get(userId) || 0;
      // True claimable = current wallet + pending withdrawals (not yet approved)
      const balanceAmount = Number(wallet.balance || 0) + pendingWithdrawals;

      return {
        userId,
        playerName: wallet.user.name,
        playerEmail: wallet.user.email,
        wonAmount,
        redeemedAmount,
        balanceAmount,
        pendingWithdrawals,
      };
    }).sort((a, b) => b.balanceAmount - a.balanceAmount);

    const totals = rows.reduce((acc, row) => {
      acc.wonAmount += row.wonAmount;
      acc.redeemedAmount += row.redeemedAmount;
      acc.balanceAmount += row.balanceAmount;
      acc.pendingWithdrawals += row.pendingWithdrawals;
      return acc;
    }, { wonAmount: 0, redeemedAmount: 0, balanceAmount: 0, pendingWithdrawals: 0 });

    res.json({
      totalClaimable: totals.balanceAmount,
      rows,
      totals,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: contest-wise claimable summary for one player
// @route   GET /api/wallet/admin/claimable-summary/:userId/contests
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetPlayerContestClaimableSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectIdLike(userId)) {
      return res.status(400).json({ message: 'Invalid player id' });
    }

    const player = await User.findById(userId).select('name email role').lean();
    if (!player) return res.status(404).json({ message: 'Player not found' });
    if (player.role === 'admin') {
      return res.status(400).json({ message: 'Admin is not treated as a player in this report' });
    }

    // All contests this player has participated in (contest-tagged scores only)
    const participations = await GameScore.aggregate([
      { $match: { user: player._id, contestId: { $ne: null } } },
      {
        $group: {
          _id: { game: '$game', contestId: '$contestId' },
          contestStart: { $first: '$contestStart' },
          contestEnd: { $first: '$contestEnd' },
          bestScore: { $max: '$score' },
          totalPlays: { $max: '$totalPlays' },
        }
      },
      { $sort: { contestStart: 1 } },
    ]);

    if (participations.length === 0) {
      return res.json({
        player: { userId: String(player._id), name: player.name, email: player.email },
        rows: [],
        totals: { wonAmount: 0, redeemedAmount: 0, balanceAmount: 0 },
      });
    }

    const gameSlugs = [...new Set(participations.map(p => p._id.game).filter(Boolean))];
    const games = await Game.find({ slug: { $in: gameSlugs } })
      .select('slug name prizes isLive activeContestId scheduleStart')
      .lean();

    const gameMap = {};
    games.forEach(g => { gameMap[g.slug] = g; });

    const now = new Date();
    const rows = [];

    // Compute rank + prize amount for each contest participation
    for (const p of participations) {
      const gameSlug = p._id.game;
      const contestId = p._id.contestId;
      const bestScore = Number(p.bestScore || 0);

      const higherUsers = await GameScore.aggregate([
        { $match: { game: gameSlug, contestId } },
        { $group: { _id: '$user', best: { $max: '$score' } } },
        { $match: { best: { $gt: bestScore } } },
        { $count: 'above' },
      ]);

      const rank = (higherUsers[0]?.above || 0) + 1;

      const game = gameMap[gameSlug];
      const prizes = Array.isArray(game?.prizes) ? game.prizes : [];
      const wonAmount = Number(prizes[rank - 1] || 0);

      const currentContestId = game?.activeContestId || safeIso(game?.scheduleStart) || null;
      const isCurrent = contestId === currentContestId;
      const isLive = isCurrent && game?.isLive === true;
      const contestEndDate = p.contestEnd ? new Date(p.contestEnd) : null;
      const hasValidEnd = !!contestEndDate && !Number.isNaN(contestEndDate.getTime());
      const isEnded = hasValidEnd ? now >= contestEndDate : !isCurrent;

      rows.push({
        game: gameSlug,
        gameName: game?.name || gameSlug,
        contestId,
        contestStart: p.contestStart,
        contestEnd: p.contestEnd,
        rank,
        bestScore,
        totalPlays: Number(p.totalPlays || 0),
        wonAmount,
        redeemedAmount: 0,
        balanceAmount: wonAmount,
        isLive,
        isEnded,
      });
    }

    // Total redeemed/paid for this player (debit + withdrawal)
    const redeemedAgg = await Transaction.aggregate([
      {
        $match: {
          user: player._id,
          $or: [
            { type: 'debit', status: { $in: ['completed', 'pending'] } },
            { type: 'withdrawal', status: { $in: ['completed', 'pending'] } },
          ],
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    let remainingRedeemed = Number(redeemedAgg[0]?.total || 0);

    // Allocate redeemed amount FIFO against won contest rewards
    const fifoRows = [...rows].sort((a, b) => new Date(a.contestStart || 0).getTime() - new Date(b.contestStart || 0).getTime());
    for (const row of fifoRows) {
      if (row.wonAmount <= 0 || remainingRedeemed <= 0) {
        row.redeemedAmount = 0;
        row.balanceAmount = row.wonAmount;
        continue;
      }

      const redeemedNow = Math.min(remainingRedeemed, row.wonAmount);
      row.redeemedAmount = redeemedNow;
      row.balanceAmount = Math.max(0, row.wonAmount - redeemedNow);
      remainingRedeemed -= redeemedNow;
    }

    const outputRows = fifoRows.sort((a, b) => new Date(b.contestStart || 0).getTime() - new Date(a.contestStart || 0).getTime());

    const totals = outputRows.reduce((acc, row) => {
      acc.wonAmount += row.wonAmount;
      acc.redeemedAmount += row.redeemedAmount;
      acc.balanceAmount += row.balanceAmount;
      return acc;
    }, { wonAmount: 0, redeemedAmount: 0, balanceAmount: 0 });

    res.json({
      player: { userId: String(player._id), name: player.name, email: player.email },
      rows: outputRows,
      totals,
      redeemedUnmappedAmount: Math.max(0, Number(redeemedAgg[0]?.total || 0) - totals.redeemedAmount),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: get transactions for a specific user
// @route   GET /api/wallet/admin/transactions/:userId
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('createdBy', 'name');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: get all pending withdrawals
// @route   GET /api/wallet/admin/withdrawals
// @access  Private/Admin
// ────────────────────────────────────────
const adminGetWithdrawals = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const transactions = await Transaction.find({ type: 'withdrawal', status })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Admin: approve or reject withdrawal
// @route   PATCH /api/wallet/admin/withdrawals/:id
// @access  Private/Admin
// ────────────────────────────────────────
const adminHandleWithdrawal = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be completed or rejected' });
    }

    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });
    if (txn.type !== 'withdrawal' || txn.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending withdrawals can be updated' });
    }

    txn.status = status;
    txn.createdBy = req.user._id;
    await txn.save();

    // If rejected, refund the amount back
    if (status === 'rejected') {
      const wallet = await getOrCreateWallet(txn.user);
      wallet.balance += txn.amount;
      await wallet.save();
    }

    // Fire-and-forget email to player
    const player = await User.findById(txn.user);
    if (player) {
      if (status === 'completed') {
        sendWithdrawalApprovedToPlayer(player.email, player.name, txn.amount);
      } else {
        sendWithdrawalRejectedToPlayer(player.email, player.name, txn.amount);
      }
    }

    res.json({ message: `Withdrawal ${status}`, transaction: txn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────
// @desc    Internal: auto-credit a player after a rewarding game best-score
// @access  Internal (called from scoreController)
// ────────────────────────────────────────
const autoCreditScore = async (userId, gameSlug, gameName, newTotalPkr) => {
  const wallet = await getOrCreateWallet(userId);
  const gameLabel = gameName || gameSlug;

  // Look for an existing reward transaction for this user + game
  // (match both old and new description for backward compatibility)
  const existingTxn = await Transaction.findOne({
    user: userId,
    type: 'credit',
    game: gameLabel,
    description: { $in: ['Best score reward', 'New best score reward'] },
  });

  if (existingTxn) {
    // Player beat their own best — update the single transaction
    const delta = parseFloat((newTotalPkr - existingTxn.amount).toFixed(2));
    if (delta <= 0) return wallet.balance; // no increase, nothing to do

    existingTxn.amount = parseFloat(newTotalPkr.toFixed(2));
    existingTxn.description = 'Best score reward';
    await existingTxn.save();

    wallet.balance = parseFloat((wallet.balance + delta).toFixed(2));
    await wallet.save();
  } else {
    // First time earning from this game — create the transaction
    const amount = parseFloat(newTotalPkr.toFixed(2));
    await Transaction.create({
      user: userId,
      type: 'credit',
      amount,
      description: 'Best score reward',
      game: gameLabel,
      status: 'completed',
    });

    wallet.balance = parseFloat((wallet.balance + amount).toFixed(2));
    await wallet.save();
  }

  return wallet.balance;
};

// ────────────────────────────────────────
// @desc    Internal: credit a player for a rewarding-game session.
//          ONE transaction per player + game + schedule period.
//          If the new score earns more PKR than the stored transaction,
//          update the amount and add the delta to the wallet.
//          A new schedule period → new transaction document.
// @access  Internal (called from scoreController)
// ────────────────────────────────────────
const creditRewardingGame = async (userId, gameLabel, earnedPkr, scheduleId) => {
  const wallet = await getOrCreateWallet(userId);
  const sid = scheduleId || '';

  // Find existing reward txn for this player + game + schedule
  const existingTxn = await Transaction.findOne({
    user: userId,
    type: 'credit',
    game: gameLabel,
    scheduleId: sid,
    description: 'Game reward',
  });

  if (existingTxn) {
    // Only update if new earnings exceed the stored amount (best score wins)
    const delta = parseFloat((earnedPkr - existingTxn.amount).toFixed(2));
    if (delta <= 0) return wallet.balance; // current best is still higher

    existingTxn.amount = parseFloat(earnedPkr.toFixed(2));
    await existingTxn.save();

    wallet.balance = parseFloat((wallet.balance + delta).toFixed(2));
    await wallet.save();
  } else {
    // First play in this schedule period — create the transaction
    const amount = parseFloat(earnedPkr.toFixed(2));
    await Transaction.create({
      user: userId,
      type: 'credit',
      amount,
      description: 'Game reward',
      game: gameLabel,
      scheduleId: sid,
      status: 'completed',
    });

    wallet.balance = parseFloat((wallet.balance + amount).toFixed(2));
    await wallet.save();
  }

  return wallet.balance;
};

module.exports = {
  getOrCreateWallet,
  autoCreditScore,
  creditRewardingGame,
  getMyWallet,
  getMyBalance,
  requestWithdrawal,
  adminCredit,
  adminDebit,
  adminGetAllWallets,
  adminGetClaimableSummary,
  adminGetPlayerContestClaimableSummary,
  adminGetUserTransactions,
  adminGetWithdrawals,
  adminHandleWithdrawal,
};
