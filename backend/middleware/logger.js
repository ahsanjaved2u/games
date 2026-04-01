const Log = require('../models/Log');

// In-memory buffer for batched writes
let logBuffer = [];
const FLUSH_INTERVAL = 10_000; // flush every 10 seconds
const FLUSH_SIZE = 50;         // or when buffer hits 50 entries

const flushLogs = async () => {
    if (logBuffer.length === 0) return;
    const batch = logBuffer.splice(0);
    try {
        await Log.insertMany(batch, { ordered: false });
    } catch (err) {
        console.error('Failed to flush logs:', err.message);
    }
};

// Periodic flush
setInterval(flushLogs, FLUSH_INTERVAL);

// Log every incoming request — visitor tracking, auth status, etc.
const requestLogger = async (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        logBuffer.push({
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown',
            referer: req.headers['referer'] || null,
            user: req.user ? req.user._id : null,
            statusCode: res.statusCode,
            responseTime: Date.now() - startTime,
        });

        if (logBuffer.length >= FLUSH_SIZE) flushLogs();
    });

    next();
};

module.exports = requestLogger;
