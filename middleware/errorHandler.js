'use strict';

const logger = require('../config/logger');
const { sendError } = require('../utils/response');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Last-resort middleware. Every route handler in this project is wrapped
 * in asyncHandler (below), so any thrown or rejected error ends up here
 * instead of crashing the process. Always responds with JSON, never lets
 * an unhandled exception take the server down.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const log = req.log || logger;
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  log.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    statusCode,
  });

  return sendError(res, {
    statusCode,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    code: err.code || ERROR_CODES.INTERNAL_ERROR,
  });
}

/**
 * Wraps an async route handler so rejected promises are forwarded to
 * next(err) automatically, instead of needing try/catch in every route.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Process-level safety nets so a stray unhandled rejection never kills
// the whole server (Render would otherwise restart it and drop in-flight
// requests).
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    message: reason?.message || String(reason),
    stack: reason?.stack,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  });
});

module.exports = { errorHandler, asyncHandler };
