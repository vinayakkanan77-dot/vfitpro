'use strict';

const express = require('express');
const { body } = require('express-validator');

const { verifyFirebaseToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { ERROR_CODES, COLLECTIONS } = require('../utils/constants');
const { db } = require('../config/firebase');
const { sendFeedbackEmail } = require('../services/email.service');

const router = express.Router();

const validators = [
  body('uid').isString().trim().notEmpty().withMessage('uid is required'),
  body('feedbackId').isString().trim().notEmpty().withMessage('feedbackId is required'),
];

router.post(
  '/sendFeedback',
  verifyFirebaseToken,
  validators,
  validate,
  asyncHandler(async (req, res) => {
    const { feedbackId } = req.body;
    const log = req.log;
    const startedAt = Date.now();

    log.info('Firestore read: feedback', { feedbackId });
    const snap = await db.collection(COLLECTIONS.FEEDBACK).doc(feedbackId).get();

    if (!snap.exists) {
      return sendError(res, { statusCode: 404, message: 'Feedback not found', code: ERROR_CODES.NOT_FOUND });
    }

    const feedback = { id: snap.id, ...snap.data() };

    let messageId;
    try {
      messageId = await sendFeedbackEmail({ feedback, log });
    } catch (error) {
      log.error('sendFeedbackEmail failed', { message: error.message });
      return sendError(res, {
        statusCode: error.statusCode || 502,
        message: 'Failed to send feedback email',
        code: ERROR_CODES.EMAIL_FAILED,
      });
    }

    log.info('sendFeedback completed', { feedbackId, durationMs: Date.now() - startedAt });

    return sendSuccess(res, {
      message: 'Feedback sent successfully',
      data: { messageId },
    });
  })
);

module.exports = router;
