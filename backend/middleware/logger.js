const Log = require('../models/Log');

// Log every incoming request — visitor tracking, auth status, etc.
const requestLogger = async (req, res, next) => {
    try {
        const startTime = Date.now();

        // Capture response status after it finishes
        // Read req.user HERE (not before routes) so auth middleware has had time to set it
        res.on('finish', async () => {
            try {
                await Log.create({
                    method: req.method,
                    url: req.originalUrl,
                    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'] || 'unknown',
                    referer: req.headers['referer'] || null,
                    user: req.user ? req.user._id : null,
                    statusCode: res.statusCode,
                    responseTime: Date.now() - startTime,
                });
            } catch (err) {
                console.error('Failed to save log:', err.message);
            }
        });
    } catch (err) {
        console.error('Logger middleware error:', err.message);
    }

    next();
};

module.exports = requestLogger;
