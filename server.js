'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const logger = require('./config/logger');
require('./config/firebase'); // fail fast if Firebase Admin credentials are bad

const healthRoutes = require('./routes/health.routes');
const billRoutes = require('./routes/bill.routes');
const stitchedRoutes = require('./routes/stitched.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render sits behind a reverse proxy; needed for correct client IPs in
// rate limiting and logging.
app.set('trust proxy', 1);

// ---- Security & performance middleware ----
app.use(helmet());
app.use(compression());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Native Android requests typically send no Origin header at all —
      // allow those through. Only enforce the allowlist for browser-origin
      // requests (e.g. if a companion web app also calls this API).
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---- Request id + structured request logger ----
app.use((req, res, next) => {
  req.requestId = uuidv4();
  req.log = logger.child(req.requestId);
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

morgan.token('id', (req) => req.requestId);
app.use(
  morgan(':id :method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (line) => logger.info(line.trim()) },
  })
);

app.use((req, res, next) => {
  req.log.info('Incoming request', { method: req.method, path: req.path });
  next();
});

// ---- Rate limiting ----
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});
app.use('/api/', limiter);

// ---- Routes ----
app.use('/api', healthRoutes);
app.use('/api', billRoutes);
app.use('/api', stitchedRoutes);
app.use('/api', feedbackRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'VFitPro backend is running' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// Central error handler — must be registered last.
app.use(errorHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  logger.info('VFitPro backend started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

module.exports = app;
