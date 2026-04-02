const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/logger');

// Route imports
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const gameRoutes = require('./routes/gameRoutes');
const walletRoutes = require('./routes/walletRoutes');
const entryRoutes = require('./routes/entryRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const referralRoutes = require('./routes/referralRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const stripeRoutes = require('./stripe/stripeRoutes');

// Competitive prize cron
const cron = require('node-cron');
const Game = require('./models/Game');
const { distributeGamePrizes } = require('./controllers/competitionController');

// Connect to MongoDB
connectDB();

const app = express();

// ── Core Middleware ──
app.use(compression({
    filter: (req, res) => {
        // Don't compress SSE streams — compression buffers prevent flush
        if (req.headers.accept === 'text/event-stream') return false;
        return compression.filter(req, res);
    },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Console logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Request logger — tracks visitors, logged-in users, IPs, etc.
app.use(requestLogger);

// ── API Routes ──
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
});

// ── Contact form endpoint ──
const { sendContactEmail } = require('./utils/mailer');
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    try {
        await sendContactEmail(name, email, subject, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (err) {
        console.error('[contact]', err.message);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// ── Error Handler (must be last) ──
app.use(errorHandler);

// ── Start Server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// ── Games/Prizes Cron (runs every minute) ──
// 1. Rewarding auto-publish when scheduleStart arrives (if not manually published)
// 2. Auto-unpublish competitive games that are live but haven't started yet
// 3. Auto-publish competitive games when scheduleStart arrives
// 4. Auto-unpublish + distribute competitive prizes when scheduleEnd passes
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        // Step 1 — rewarding auto-publish by schedule start
        // Manual publish still works independently via admin "Published" checkbox.
        await Game.updateMany(
            {
                gameType: 'rewarding',
                isLive: false,
                showSchedule: true,
                scheduleStart: { $ne: null, $lte: now },
            },
            { $set: { isLive: true } }
        );

        // Step 2 — force-unpublish: still before scheduleStart (shouldn't be live yet)
        await Game.updateMany(
            {
                gameType: 'competitive',
                isLive: true,
                scheduleStart: { $ne: null, $gt: now },
            },
            { $set: { isLive: false } }
        );

        // Step 3 — auto-publish: scheduleStart has passed, scheduleEnd hasn't yet
        await Game.updateMany(
            {
                gameType: 'competitive',
                isLive: false,
                prizesDistributed: false,
                scheduleStart: { $ne: null, $lte: now },
                scheduleEnd: { $ne: null, $gt: now },
            },
            { $set: { isLive: true } }
        );

        // Step 4 — auto-end + distribute prizes: scheduleEnd has passed
        const expiredGames = await Game.find({
            gameType: 'competitive',
            prizesDistributed: false,
            scheduleEnd: { $ne: null, $lte: now },
        });
        for (const game of expiredGames) {
            const result = await distributeGamePrizes(game);
            if (result.distributed) {
                console.log(`[Cron] Prizes distributed for "${game.name}":`, result.results);
            } else if (result.skipped) {
                console.log(`[Cron] Skipped prizes for "${game.name}": ${result.reason}`);
            }
        }
    } catch (err) {
        console.error('[Cron] Prize distribution error:', err.message);
    }
});
