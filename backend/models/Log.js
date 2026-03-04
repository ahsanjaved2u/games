const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    ip: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        default: 'unknown',
    },
    referer: {
        type: String,
        default: null,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    statusCode: {
        type: Number,
        default: null,
    },
    responseTime: {
        type: Number, // milliseconds
        default: null,
    },
}, {
    timestamps: true,
});

// Index for efficient querying
logSchema.index({ createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ ip: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
