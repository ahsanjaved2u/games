const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
        }

        // Block soft-deleted or blocked users
        if (req.user) {
            if (req.user.deletedAt) {
                return res.status(403).json({ success: false, message: 'Account has been deleted' });
            }
            if (req.user.blockedUntil && new Date(req.user.blockedUntil) > new Date()) {
                return res.status(403).json({ success: false, message: `Account blocked until ${new Date(req.user.blockedUntil).toLocaleDateString()}` });
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    }
};

// Admin only
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

module.exports = { protect, admin };
