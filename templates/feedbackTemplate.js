'use strict';

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * @param {object} params
 * @param {object} params.feedback Firestore feedback doc data
 */
function buildFeedbackEmail({ feedback }) {
  const subject = `New feedback received${feedback.rating ? ` (${feedback.rating}★)` : ''}`;

  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
    <h2 style="color:#2b2b2b;">New Feedback</h2>
    <p><strong>From:</strong> ${escapeHtml(feedback.customerName || 'Anonymous')}</p>
    ${feedback.rating ? `<p><strong>Rating:</strong> ${escapeHtml(feedback.rating)} / 5</p>` : ''}
    <p><strong>Message:</strong></p>
    <p style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(feedback.message || '')}</p>
    ${feedback.createdAt ? `<p style="color:#777;font-size:12px;">Submitted: ${escapeHtml(feedback.createdAt)}</p>` : ''}
  </div>`;

  return { subject, htmlContent };
}

module.exports = { buildFeedbackEmail };
