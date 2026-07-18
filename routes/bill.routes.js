'use strict';

const express = require('express');
const { body } = require('express-validator');

const { verifyFirebaseToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { ERROR_CODES } = require('../utils/constants');

const { getCustomerById } = require('../services/customer.service');
const { getBillById } = require('../services/bill.service');
const { getShopByUid } = require('../services/shop.service');
const { sendBillEmail } = require('../services/email.service');

const router = express.Router();

const validators = [
  body('uid').isString().trim().notEmpty().withMessage('uid is required'),
  body('customerId').isString().trim().notEmpty().withMessage('customerId is required'),
  body('billId').isString().trim().notEmpty().withMessage('billId is required'),
];

router.post(
  '/sendBill',
  verifyFirebaseToken,
  validators,
  validate,
  asyncHandler(async (req, res) => {
    const { uid, customerId, billId } = req.body;
    const log = req.log;
    const startedAt = Date.now();

    const [customer, bill, shop] = await Promise.all([
      getCustomerById(uid, customerId, log),
      getBillById(uid, billId, log),
      getShopByUid(uid, log),
    ]);

    if (!customer) {
      return sendError(res, {
        statusCode: 404,
        message: 'Customer not found',
        code: ERROR_CODES.NOT_FOUND,
      });
    }

    if (!bill) {
      return sendError(res, {
        statusCode: 404,
        message: 'Bill not found',
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

    customer.uid = uid;

    let messageId;

    try {
      messageId = await sendBillEmail({
        customer,
        bill,
        shop,
        log,
      });
    } catch (error) {
      log.error('sendBillEmail failed', {
        message: error.message,
        stack: error.stack,
      });

      return sendError(res, {
        statusCode: error.statusCode || 502,
        message: error.message || 'Failed to send bill email',
        code: ERROR_CODES.EMAIL_FAILED,
      });
    }

    log.info('sendBill completed', {
      uid,
      customerId,
      billId,
      durationMs: Date.now() - startedAt,
    });

    return sendSuccess(res, {
      message: 'Bill sent successfully',
      data: {
        messageId,
      },
    });
  })
);

module.exports = router;
