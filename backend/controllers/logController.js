const Log = require('../models/Log');

// @desc    Get all logs (with pagination & filters)
// @route   GET /api/logs
// @access  Private/Admin
exports.getLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Optional filters
        const filter = {};
        if (req.query.user) filter.user = req.query.user;
        if (req.query.method) filter.method = req.query.method.toUpperCase();
        if (req.query.ip) filter.ip = req.query.ip;

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .populate('user', 'name email')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit),
            Log.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            logs,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get visitor stats (unique IPs, logged-in users, etc.)
// @route   GET /api/logs/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [totalRequests, todayRequests, uniqueIPs, uniqueUsers] = await Promise.all([
            Log.countDocuments(),
            Log.countDocuments({ createdAt: { $gte: today } }),
            Log.distinct('ip', { createdAt: { $gte: thisWeek } }),
            Log.distinct('user', { user: { $ne: null }, createdAt: { $gte: thisWeek } }),
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalRequests,
                todayRequests,
                uniqueVisitorsThisWeek: uniqueIPs.length,
                activeUsersThisWeek: uniqueUsers.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear old logs (older than 30 days)
// @route   DELETE /api/logs/cleanup
// @access  Private/Admin
exports.cleanupLogs = async (req, res, next) => {
    try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Log.deleteMany({ createdAt: { $lt: cutoff } });

        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} logs older than 30 days`,
        });
    } catch (error) {
        next(error);
    }
};
