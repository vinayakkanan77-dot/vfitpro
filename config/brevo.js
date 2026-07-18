'use strict';

const axios = require('axios');
const logger = require('./logger');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'VFitPro';

if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
  logger.warn('Brevo is not fully configured — BREVO_API_KEY or BREVO_SENDER_EMAIL missing');
}

const brevoClient = axios.create({
  baseURL: BREVO_API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'api-key': BREVO_API_KEY,
  },
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a transactional email through Brevo's REST API with automatic
 * retry on transient failures (network errors, 429, 5xx). Does not retry
 * on 4xx client errors other than 429, since retrying a malformed request
 * will never succeed.
 *
 * @param {object} params
 * @param {{email: string, name?: string}} params.to
 * @param {string} params.subject
 * @param {string} params.htmlContent
 * @param {object} [params.log] request-scoped logger
 * @returns {Promise<{messageId: string}>}
 */
async function sendTransactionalEmail({ to, subject, htmlContent, log = logger }) {
  const payload = {
    sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
    to: [to],
    subject,
    htmlContent,
  };

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      log.info('Brevo request', { attempt, to: to.email, subject });
      const response = await brevoClient.post('', payload);
      log.info('Brevo response', {
        attempt,
        status: response.status,
        messageId: response.data?.messageId,
      });
      return { messageId: response.data?.messageId || '' };
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const retriable = !status || status === 429 || status >= 500;

      log.warn('Brevo request failed', {
        attempt,
        status,
        message: error.message,
        retriable,
      });

      if (!retriable || attempt === MAX_RETRIES) {
        break;
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const status = lastError.response?.status;
  const detail = lastError.response?.data?.message || lastError.message;
  const err = new Error(`Brevo email send failed: ${detail}`);
  err.statusCode = status && status < 500 ? 502 : 502;
  err.cause = lastError;
  throw err;
}

module.exports = { sendTransactionalEmail };
