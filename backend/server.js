const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/logger');

// Route imports
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const scoreRoutes = require('./routes/scoreRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// ── Core Middleware ──
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

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
});

// ── Error Handler (must be last) ──
app.use(errorHandler);

// ── Start Server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
