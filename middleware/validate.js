'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Runs after an array of express-validator checks. If any failed, returns
 * a 400 with the list of field errors instead of letting the route handler
 * run with bad input.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  req.log?.warn('Validation failed', { errors: errors.array() });

  return sendError(res, {
    statusCode: 400,
    message: 'Validation failed',
    code: ERROR_CODES.VALIDATION_ERROR,
    details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

module.exports = { validate };
