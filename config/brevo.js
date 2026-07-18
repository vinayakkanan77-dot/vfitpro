'use strict';

const axios = require('axios');
const logger = require('./logger');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();
const BREVO_SENDER_EMAIL = (process.env.BREVO_SENDER_EMAIL || '').trim();
const BREVO_SENDER_NAME =
  (process.env.BREVO_SENDER_NAME || 'VFitPro').trim();

logger.info('Brevo configuration', {
  hasApiKey: !!BREVO_API_KEY,
  senderEmail: BREVO_SENDER_EMAIL || '(missing)',
  senderName: BREVO_SENDER_NAME,
});

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

async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  log = logger,
}) {

  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY environment variable is missing.');
  }

  if (!BREVO_SENDER_EMAIL) {
    throw new Error('BREVO_SENDER_EMAIL environment variable is missing.');
  }

  const payload = {
    sender: {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    },
    to: [
      {
        email: to.email,
        name: to.name || '',
      },
    ],
    subject,
    htmlContent,
  };

  log.info('Brevo payload', {
    sender: payload.sender,
    to: payload.to,
    subject,
  });

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

    try {

      log.info('Brevo request', {
        attempt,
        to: to.email,
        subject,
      });

      const response = await brevoClient.post('', payload);

      log.info('Brevo response', {
        status: response.status,
        messageId: response.data?.messageId,
      });

      return {
        messageId: response.data?.messageId || '',
      };

    } catch (error) {

      lastError = error;

      const status = error.response?.status;

      log.error('Brevo error response', {
        attempt,
        status,
        data: error.response?.data,
      });

      const retriable = !status || status === 429 || status >= 500;

      if (!retriable || attempt === MAX_RETRIES) {
        break;
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const detail =
    lastError.response?.data?.message ||
    JSON.stringify(lastError.response?.data) ||
    lastError.message;

  const err = new Error(`Brevo email send failed: ${detail}`);
  err.statusCode = 502;
  throw err;
}

module.exports = {
  sendTransactionalEmail,
};
