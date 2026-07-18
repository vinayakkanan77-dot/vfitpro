'use strict';

/**
 * Consistent JSON envelope for every route, success or failure.
 */
function sendSuccess(res, { statusCode = 200, message = 'Success', data = {} } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
}

function sendError(res, { statusCode = 500, message = 'Something went wrong', code = 'INTERNAL_ERROR', details } = {}) {
  const body = {
    success: false,
    message,
    code,
  };
  if (details !== undefined) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
