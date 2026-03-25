const User = require('../models/User');
const Game = require('../models/Game');
const GameScore = require('../models/GameScore');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AppSettings = require('../models/AppSettings');
const crypto = require('crypto');
const { sendVerificationCode } = require('../utils/mailer');

// Generate a 6-digit verification code
const generateCode = () => crypto.randomInt(100000, 999999).toString();

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({ name, email, password });

        // Generate verification code and send email
        const code = generateCode();
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await user.save({ validateBeforeSave: false });
        sendVerificationCode(email, name, code).catch(err => console.error('[verify-email]', err.message));

        // Credit signup reward if configured
        let signupRewardAmount = 0;
        try {
            const reward = await AppSettings.getSetting('signupReward', 0);
            signupRewardAmount = Number(reward) || 0;
            if (signupRewardAmount > 0) {
                let wallet = await Wallet.findOne({ user: user._id });
                if (!wallet) wallet = await Wallet.create({ user: user._id, balance: 0 });
                wallet.balance = parseFloat((wallet.balance + signupRewardAmount).toFixed(2));
                await wallet.save();
                await Transaction.create({
                    user: user._id,
                    type: 'credit',
                    amount: signupRewardAmount,
                    description: 'Signup reward',
                    status: 'completed',
                });
            }
        } catch (err) {
            console.error('[signup-reward]', err.message);
        }

        const token = user.getSignedJwtToken();

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: false },
            signupReward: signupRewardAmount,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify email with 6-digit code
// @route   POST /api/users/verify-email
// @access  Private
exports.verifyEmail = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Verification code is required' });

        const user = await User.findById(req.user.id).select('+verificationCode +verificationCodeExpires');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.emailVerified) return res.json({ success: true, message: 'Email already verified' });

        if (!user.verificationCode || user.verificationCode !== code.toString()) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }
        if (user.verificationCodeExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'Code expired. Please request a new one.' });
        }

        user.emailVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Resend verification code
// @route   POST /api/users/resend-code
// @access  Private
exports.resendCode = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.emailVerified) return res.json({ success: true, message: 'Email already verified' });

        const code = generateCode();
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        await sendVerificationCode(user.email, user.name, code);
        res.json({ success: true, message: 'Verification code sent' });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged-in user
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users (admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().sort('-createdAt');
        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email, avatar } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, email, avatar },
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin profile summary (platform-level compact analytics)
// @route   GET /api/users/admin/profile-summary
// @access  Private/Admin
exports.getAdminProfileSummary = async (req, res, next) => {
    try {
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [games, players] = await Promise.all([
            Game.find().select('slug name gameType isLive scheduleEnd prizesDistributed').lean(),
            User.find({ role: { $ne: 'admin' } }).select('_id name email').lean(),
        ]);

        const playerIds = players.map((p) => p._id);
        const scoreMatch = playerIds.length > 0 ? { user: { $in: playerIds } } : { user: null };

        const [
            contestRoundsAgg,
            contestsJoinedAgg,
            attemptsByTypeAgg,
            totalWonAgg,
            totalRedeemedAgg,
            totalBalanceAgg,
            pendingWithdrawalsAgg,
            attemptsByGameAgg,
            topPlayersRaw,
            activeGames7dAgg,
        ] = await Promise.all([
            GameScore.aggregate([
                { $match: { ...scoreMatch, contestId: { $ne: null } } },
                { $group: { _id: '$contestId' } },
                { $count: 'count' },
            ]),
            GameScore.aggregate([
                { $match: { ...scoreMatch, contestId: { $ne: null } } },
                { $group: { _id: { user: '$user', contestId: '$contestId' } } },
                { $count: 'count' },
            ]),
            GameScore.aggregate([
                { $match: scoreMatch },
                {
                    $group: {
                        _id: null,
                        totalContestAttempts: {
                            $sum: {
                                $cond: [
                                    { $ne: ['$contestId', null] },
                                    { $ifNull: ['$totalPlays', 1] },
                                    0
                                ]
                            }
                        },
                        totalRewardingAttempts: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$contestId', null] },
                                    { $ifNull: ['$totalPlays', 1] },
                                    0
                                ]
                            }
                        },
                    }
                }
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        user: { $in: playerIds },
                        type: 'credit',
                        status: { $in: ['completed', 'pending'] },
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        user: { $in: playerIds },
                        $or: [
                            { type: 'debit', status: { $in: ['completed', 'pending'] } },
                            { type: 'withdrawal', status: { $in: ['completed', 'pending'] } },
                        ],
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Wallet.aggregate([
                { $match: { user: { $in: playerIds } } },
                { $group: { _id: null, total: { $sum: '$balance' } } },
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        user: { $in: playerIds },
                        type: 'withdrawal',
                        status: 'pending',
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    }
                }
            ]),
            GameScore.aggregate([
                { $match: scoreMatch },
                {
                    $group: {
                        _id: '$game',
                        totalAttempts: { $sum: { $ifNull: ['$totalPlays', 1] } },
                        contestAttempts: {
                            $sum: {
                                $cond: [
                                    { $ne: ['$contestId', null] },
                                    { $ifNull: ['$totalPlays', 1] },
                                    0
                                ]
                            }
                        },
                        rewardingAttempts: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$contestId', null] },
                                    { $ifNull: ['$totalPlays', 1] },
                                    0
                                ]
                            }
                        },
                        players: { $addToSet: '$user' },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        game: '$_id',
                        totalAttempts: 1,
                        contestAttempts: 1,
                        rewardingAttempts: 1,
                        playerCount: { $size: '$players' },
                    }
                },
                { $sort: { totalAttempts: -1 } },
                { $limit: 5 },
            ]),
            Wallet.find({ user: { $in: playerIds } })
                .sort({ balance: -1 })
                .limit(5)
                .populate('user', 'name email role')
                .lean(),
            GameScore.aggregate([
                { $match: { ...scoreMatch, updatedAt: { $gte: sevenDaysAgo } } },
                { $group: { _id: '$game' } },
            ]),
        ]);

        const totalGames = games.length;
        const competitiveGames = games.filter((g) => g?.gameType === 'competitive').length;
        const rewardingGames = games.filter((g) => g?.gameType !== 'competitive').length;
        const liveGames = games.filter((g) => g?.isLive).length;

        const totalContestRounds = Number(contestRoundsAgg[0]?.count || 0);
        const totalContestsJoined = Number(contestsJoinedAgg[0]?.count || 0);

        const totalContestAttempts = Number(attemptsByTypeAgg[0]?.totalContestAttempts || 0);
        const totalRewardingAttempts = Number(attemptsByTypeAgg[0]?.totalRewardingAttempts || 0);
        const totalAttempts = totalContestAttempts + totalRewardingAttempts;

        const totalWonAmount = Number(totalWonAgg[0]?.total || 0);
        const totalRedeemedAmount = Number(totalRedeemedAgg[0]?.total || 0);
        const totalBalanceAmount = Number(totalBalanceAgg[0]?.total || 0);
        const redemptionRate = totalWonAmount > 0
            ? Number(((totalRedeemedAmount / totalWonAmount) * 100).toFixed(2))
            : 0;

        const pendingWithdrawalsCount = Number(pendingWithdrawalsAgg[0]?.count || 0);
        const pendingWithdrawalsAmount = Number(pendingWithdrawalsAgg[0]?.amount || 0);

        const gameMap = {};
        games.forEach((g) => { if (g?.slug) gameMap[g.slug] = g; });

        const topGamesByAttempts = attemptsByGameAgg.map((row) => {
            const gameDoc = gameMap[row.game];
            return {
                game: row.game,
                gameName: gameDoc?.name || row.game,
                totalAttempts: Number(row.totalAttempts || 0),
                contestAttempts: Number(row.contestAttempts || 0),
                rewardingAttempts: Number(row.rewardingAttempts || 0),
                playerCount: Number(row.playerCount || 0),
            };
        });

        const topPlayersByBalance = topPlayersRaw
            .filter((w) => w?.user && w.user.role !== 'admin')
            .map((w) => ({
                userId: String(w.user._id),
                name: w.user.name,
                email: w.user.email,
                balanceAmount: Number(w.balance || 0),
            }));

        const activeGames7d = new Set(activeGames7dAgg.map((x) => x?._id).filter(Boolean));
        const gamesNoPlays7d = games.filter((g) => g?.slug && !activeGames7d.has(g.slug)).length;

        const contestsEnding24h = games.filter((g) => {
            if (g?.gameType !== 'competitive' || !g?.scheduleEnd || g?.prizesDistributed) return false;
            const end = new Date(g.scheduleEnd);
            return end > now && end <= next24h;
        }).length;

        const prizesPendingDistribution = games.filter((g) => {
            if (g?.gameType !== 'competitive' || !g?.scheduleEnd || g?.prizesDistributed) return false;
            const end = new Date(g.scheduleEnd);
            return end <= now;
        }).length;

        res.status(200).json({
            success: true,
            summary: {
                totalGames,
                competitiveGames,
                rewardingGames,
                liveGames,
                totalContestRounds,
                totalContestsJoined,
                totalContestAttempts,
                totalRewardingAttempts,
                totalAttempts,
                totalWonAmount,
                totalRedeemedAmount,
                totalBalanceAmount,
                redemptionRate,
                pendingWithdrawalsCount,
                pendingWithdrawalsAmount,
                contestsEnding24h,
                gamesNoPlays7d,
                prizesPendingDistribution,
            },
            topGamesByAttempts,
            topPlayersByBalance,
            generatedAt: now,
        });
    } catch (error) {
        next(error);
    }
};
