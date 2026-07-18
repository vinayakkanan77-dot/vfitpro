'use strict';

const express = require('express');
const { body } = require('express-validator');

const { verifyFirebaseToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { ERROR_CODES } = require('../utils/constants');

const { getCustomerById } = require('../services/customer.service');
const { getShopByUid } = require('../services/shop.service');
const { sendStitchedEmail } = require('../services/email.service');

const router = express.Router();

const validators = [
  body('uid')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('uid is required'),

  body('customerId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('customerId is required'),
];

router.post(
  '/sendStitched',
  verifyFirebaseToken,
  validators,
  validate,
  asyncHandler(async (req, res) => {
    const { uid, customerId } = req.body;
    const log = req.log;
    const startedAt = Date.now();

    const [customer, shop] = await Promise.all([
      getCustomerById(uid, customerId, log),
      getShopByUid(uid, log),
    ]);

    if (!customer) {
      return sendError(res, {
        statusCode: 404,
        message: 'Customer not found',
        code: ERROR_CODES.NOT_FOUND,
      });
    }

    if (!shop) {
      return sendError(res, {
        statusCode: 404,
        message: 'Shop not found',
        code: ERROR_CODES.NOT_FOUND,
      });
    }

    if (!customer.email) {
      return sendError(res, {
        statusCode: 400,
        message: 'Customer has no email on file',
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    }

    // Pass uid to email service for nested Firestore updates
    customer.uid = uid;

    let messageId;

    try {
      messageId = await sendStitchedEmail({
        customer,
        shop,
        log,
      });
    } catch (error) {
      log.error('sendStitchedEmail failed', {
        message: error.message,
        stack: error.stack,
      });

      return sendError(res, {
        statusCode: error.statusCode || 502,
        message: error.message || 'Failed to send stitched email',
        code: ERROR_CODES.EMAIL_FAILED,
      });
    }

    log.info('sendStitched completed', {
      uid,
      customerId,
      durationMs: Date.now() - startedAt,
    });

    return sendSuccess(res, {
      message: 'Stitched notification sent successfully',
      data: {
        messageId,
      },
    });
  })
);

module.exports = router;
