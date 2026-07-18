'use strict';

/**
 * Minimal dependency-free structured logger.
 * Writes JSON lines to stdout/stderr so Render's log pipeline can capture
 * and index them. Also exposes a request-scoped child logger that stamps
 * every line with a request id, making it possible to trace a single
 * request across auth, Firestore, and Brevo calls.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function write(level, message, meta = {}) {
  if (LEVELS[level] > CURRENT_LEVEL) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

const logger = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
  /**
   * Returns a logger bound to a requestId so every call site doesn't have
   * to remember to pass it.
   */
  child(requestId) {
    return {
      error: (message, meta = {}) => write('error', message, { requestId, ...meta }),
      warn: (message, meta = {}) => write('warn', message, { requestId, ...meta }),
      info: (message, meta = {}) => write('info', message, { requestId, ...meta }),
      debug: (message, meta = {}) => write('debug', message, { requestId, ...meta }),
    };
  },
};

module.exports = logger;
