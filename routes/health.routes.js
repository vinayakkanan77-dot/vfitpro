'use strict';

const express = require('express');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => {
  return sendSuccess(res, {
    message: 'VFitPro backend is healthy',
    data: {
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
