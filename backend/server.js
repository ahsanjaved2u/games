// ══════════════════════════════════════════════════════════════════════════════
//  SERVER — Cron jobs for Contest & Session lifecycle
//
//  CONTEST CRON (runs every 10s):
//    - Auto-promotes 'scheduled' contests to 'live' when startDate passes.
//    - Auto-ends 'live' contests when endDate passes (status → 'ended').
//    - Distributes prizes for ended contests (prizes[] array, top N scorers).
//      Prize distribution is the ONLY way contest players get rewarded.
//      No real-time wallet credits happen during contest play.
//    - After distribution, status → 'distributed', prizesDistributed → true.
//
//  SESSION CRON (runs every 10s):
//    - Sessions are time-windowed periods that auto-renew.
//    - Each session has periodAnchor + duration → defines when the period ends.
//    - When a period expires, the cron:
//        1. Archives it as a SessionPeriod.
//        2. Ends the current session (ended=true, isActive=false).
//        3. Spawns a successor session with the SAME config (name, conversionRate,
//           showCurrency, tag, etc.) but a new periodAnchor.
//    - SKIP-AHEAD: If the server was down and many periods were missed,
//      nextAnchor skips forward to the current valid period (no chaining).
//    - PAUSE: If session.pause=true, the session ends but NO successor spawns.
//    - conversionRate is copied from parent → successor. If the original had 0,
//      all successors will have 0. Fix via admin dashboard or direct DB update.
// ══════════════════════════════════════════════════════════════════════════════

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
const contestRoutes = require('./routes/contestRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

// Contest / prize cron
const cron = require('node-cron');
const Game = require('./models/Game');
const Contest = require('./models/Contest');
const Session = require('./models/Session');
const SessionPeriod = require('./models/SessionPeriod');
const { distributeContestPrizes } = require('./controllers/competitionController');
const { getSessionPeriod } = require('./controllers/sessionController');

// Connect to MongoDB
connectDB();

const app = express();

// ── Core Middleware ──
app.use(cors());
app.use(compression({
    filter: (req, res) => {
        // Don't compress SSE streams — compression buffers prevent flush
        if (req.headers.accept === 'text/event-stream') return false;
        return compression.filter(req, res);
    },
}));
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
app.use('/api/contests', contestRoutes);
app.use('/api/sessions', sessionRoutes);

// Public SSE stream — broadcasts game/session changes to all connected clients (no auth)
const { addPublicClient, broadcastEvent } = require('./utils/sse');
app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders();
    res.write(':\n\n');
    addPublicClient(res);
});

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
// 1. Contest auto-start: scheduled → live
// 2. Contest auto-end + prize distribution: live → ended → distributed
// 3. Session period archival
cron.schedule('*/10 * * * * *', async () => {
    try {
        const now = new Date();

        // Step 1 — auto-start scheduled contests whose startDate has arrived
        const contestsToStart = await Contest.find({
            status: 'scheduled',
            startDate: { $lte: now },
            endDate: { $gt: now },
        }).populate('game');

        for (const contest of contestsToStart) {
            contest.status = 'live';
            await contest.save();
            if (contest.game && !contest.game.isLive) {
                contest.game.isLive = true;
                await contest.game.save();
                console.log(`[Cron] Contest started for "${contest.game.name}"`);
            }
        }

        // Step 2 — auto-end contests whose endDate has passed, then distribute prizes
        const contestsToEnd = await Contest.find({
            status: 'live',
            endDate: { $lte: now },
            prizesDistributed: false,
        }).populate('game');

        for (const contest of contestsToEnd) {
            contest.status = 'ended';
            await contest.save();

            if (!contest.game) {
                console.warn(`[Cron] Skipping prize distribution for contest ${contest._id}: game deleted`);
                continue;
            }

            try {
                const result = await distributeContestPrizes(contest);
                if (result.distributed) {
                    console.log(`[Cron] Prizes distributed for contest ${contest._id}:`, result.results);
                } else if (result.skipped) {
                    console.log(`[Cron] Skipped prizes for contest ${contest._id}: ${result.reason}`);
                }
            } catch (distErr) {
                console.error(`[Cron] ERROR distributing prizes for contest ${contest._id}:`, distErr.message, distErr.stack);
            }
        }

        // Step 3 — session auto-end: lock expired sessions and spawn successors
        const activeSessions = await Session.find({ isActive: true, ended: false });
        for (const sess of activeSessions) {
            const periodMs = ((sess.durationDays || 0) * 86400000)
                + ((sess.durationHours || 0) * 3600000)
                + ((sess.durationMinutes || 0) * 60000);
            if (periodMs <= 0) continue;

            const anchorMs = sess.periodAnchor ? new Date(sess.periodAnchor).getTime() : 0;
            const endOfPeriod = anchorMs + periodMs;

            if (Date.now() >= endOfPeriod) {
                // Archive the finished period
                await SessionPeriod.findOneAndUpdate(
                    { session: sess._id, periodStart: sess.periodAnchor },
                    {
                        $setOnInsert: {
                            session: sess._id,
                            game: sess.game ? String(sess.game) : '',
                            periodStart: sess.periodAnchor,
                            periodEnd: new Date(endOfPeriod),
                            rewardsDistributed: true,
                        }
                    },
                    { upsert: true }
                ).catch(() => {});

                // If pause is set, end it but don't spawn a successor
                if (sess.pause) {
                    sess.ended = true;
                    sess.isActive = false;
                    await sess.save();
                    console.log(`[Cron] Session ${sess._id} ended & paused (no successor)`);
                    broadcastEvent('session-update', { sessionId: sess._id, gameId: sess.game });
                    continue;
                }

                // Normal flow: lock the current session and spawn successor
                sess.ended = true;
                sess.isActive = false;
                await sess.save();
                console.log(`[Cron] Session ${sess._id} ended (period finished)`);

                // Calculate the current valid period anchor (skip over missed periods)
                let nextAnchor = endOfPeriod;
                while (nextAnchor + periodMs <= Date.now()) {
                    nextAnchor += periodMs;
                }

                // Spawn a successor session with the same config
                await Session.create({
                    game: sess.game,
                    name: sess.name,
                    isActive: true,
                    ended: false,
                    durationDays: sess.durationDays,
                    durationHours: sess.durationHours,
                    durationMinutes: sess.durationMinutes,
                    periodAnchor: new Date(nextAnchor),
                    conversionRate: sess.conversionRate,
                    showCurrency: sess.showCurrency,
                    entryFee: sess.entryFee,
                    attemptCost: sess.attemptCost,
                    hasTimeLimit: sess.hasTimeLimit,
                    timeLimitSeconds: sess.timeLimitSeconds,
                    color: sess.color,
                    tag: sess.tag,
                    instructions: sess.instructions,
                });
                console.log(`[Cron] New session spawned for game ${sess.game}`);
                broadcastEvent('session-update', { gameId: sess.game });
            }
        }
    } catch (err) {
        console.error('[Cron] Cron error:', err.message);
    }
});
