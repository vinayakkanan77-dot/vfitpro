'use strict';

const {
  COLORS,
  escapeHtml,
  buildLogoHeader,
  buildFooter,
  wrapEmail,
  resolveShopName,
} = require('./_shared');

function formatFeedbackDate(rawDate) {
  if (!rawDate) return '';
  if (typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
    return rawDate.toDate().toLocaleString('en-IN');
  }
  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString('en-IN');
  }
  return String(rawDate);
}

function renderStars(rating) {
  const numeric = Number(rating);
  if (!numeric || Number.isNaN(numeric)) return '';
  const full = Math.max(0, Math.min(5, Math.round(numeric)));
  const empty = 5 - full;
  return '&#9733;'.repeat(full) + '&#9734;'.repeat(empty);
}

/**
 * A single "label : value" row inside the info card. Returns an empty
 * string (and is dropped by the caller) when the value is missing.
 */
function infoRow(icon, label, value) {
  if (value === undefined || value === null || value === '') return '';
  return `
              <tr>
                <td style="padding:10px 22px;border-top:1px solid ${COLORS.border};font-size:14px;color:${COLORS.text};white-space:nowrap;">${icon} ${escapeHtml(
    label
  )}</td>
                <td style="padding:10px 22px;border-top:1px solid ${COLORS.border};font-size:14px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:10px 22px;border-top:1px solid ${COLORS.border};font-size:14px;color:${COLORS.maroon};font-weight:700;text-align:right;word-break:break-word;">${escapeHtml(
    value
  )}</td>
              </tr>`;
}

/**
 * Redesigned as a professional support-ticket style notification for the
 * shop owner whenever a customer submits feedback through the app.
 *
 * @param {object} params
 * @param {object} params.feedback Firestore feedback doc data. All fields are
 *   optional except `message`; anything missing is simply omitted from the email.
 *   Recognized fields: customerName, customerEmail, phone, rating, message,
 *   createdAt (or date), shopName, screenshotUrl (or screenshot/imageUrl),
 *   appVersion, device, platform.
 */
function buildFeedbackEmail({ feedback = {} }) {
  const customerName = feedback.customerName || feedback.name || 'Anonymous';
  const customerEmail = feedback.customerEmail || feedback.email || '';
  const phone = feedback.phone || feedback.phoneNumber || '';
  const rating = feedback.rating;
  const stars = renderStars(rating);
  const message = feedback.message || feedback.feedback || '';
  const submittedAt = formatFeedbackDate(feedback.createdAt || feedback.date);
  const shopName = feedback.shopName || (feedback.shop ? resolveShopName(feedback.shop) : '');
  const screenshotUrl = feedback.screenshotUrl || feedback.screenshot || feedback.imageUrl || '';
  const appVersion = feedback.appVersion || feedback.version || '';
  const device = feedback.device || feedback.deviceModel || '';
  const platform = feedback.platform || feedback.os || '';

  const greetingRow = `
  <tr>
    <td style="padding:28px 28px 0 28px;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="display:inline-block;background:${COLORS.maroon};color:#ffffff;font-weight:700;
                         font-size:12px;letter-spacing:1.2px;border-radius:20px;padding:7px 18px;">
              &#128172; NEW FEEDBACK RECEIVED
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:14px;font-size:15px;color:${COLORS.textMuted};line-height:1.55;">
            A customer just submitted feedback${shopName ? ` for <strong style="color:${COLORS.maroon};">${escapeHtml(
    shopName
  )}</strong>` : ''}. Details are below.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const ratingRow = stars
    ? `
  <tr>
    <td style="padding:20px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${COLORS.pink};border-radius:14px;">
        <tr>
          <td align="center" style="padding:14px 18px;font-family:'Segoe UI',Arial,sans-serif;">
            <div style="font-size:22px;color:${COLORS.maroon};letter-spacing:2px;">${stars}</div>
            <div style="font-size:12px;color:${COLORS.textMuted};margin-top:4px;">${escapeHtml(
        String(rating)
      )} out of 5</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const customerRows = [
    infoRow('&#128100;', 'Customer', customerName),
    infoRow('&#9993;', 'Email', customerEmail),
    infoRow('&#128222;', 'Phone', phone),
    infoRow('&#128337;', 'Submitted', submittedAt),
  ]
    .filter(Boolean)
    .join('');

  const customerCardRow = customerRows
    ? `
  <tr>
    <td style="padding:22px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:16px;">
        <tr>
          <td align="center" style="padding:16px 0 4px 0;">
            <span style="font-family:'Segoe UI',Arial,sans-serif;font-weight:700;font-size:13px;color:${COLORS.maroon};letter-spacing:1.2px;">
              &#128100; CUSTOMER DETAILS
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0 14px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',Arial,sans-serif;">
              ${customerRows}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const messageRow = message
    ? `
  <tr>
    <td style="padding:22px 28px 0 28px;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="font-weight:700;font-size:13px;color:${COLORS.maroon};letter-spacing:1.2px;margin-bottom:10px;">
        &#128172; MESSAGE
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${COLORS.pink};border-radius:14px;">
        <tr>
          <td style="padding:16px 18px;font-size:15px;color:${COLORS.text};line-height:1.6;white-space:pre-wrap;">${escapeHtml(
      message
    )}</td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const metaRows = [
    infoRow('&#128241;', 'Platform', platform),
    infoRow('&#128187;', 'Device', device),
    infoRow('&#128295;', 'App Version', appVersion),
  ]
    .filter(Boolean)
    .join('');

  const metaCardRow = metaRows
    ? `
  <tr>
    <td style="padding:22px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:16px;">
        <tr>
          <td align="center" style="padding:16px 0 4px 0;">
            <span style="font-family:'Segoe UI',Arial,sans-serif;font-weight:700;font-size:13px;color:${COLORS.maroon};letter-spacing:1.2px;">
              &#9881; TECHNICAL DETAILS
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0 14px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',Arial,sans-serif;">
              ${metaRows}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const screenshotRow = screenshotUrl
    ? `
  <tr>
    <td style="padding:26px 28px 0 28px;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="font-weight:700;font-size:13px;color:${COLORS.maroon};letter-spacing:1.2px;margin-bottom:10px;">
        &#128247; SCREENSHOT
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
        <tr>
          <td>
            <img src="${escapeHtml(screenshotUrl)}" alt="Feedback screenshot"
                 width="100%" style="display:block;width:100%;height:auto;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const bodyRows = `
    ${buildLogoHeader(feedback.shop)}
    ${greetingRow}
    ${ratingRow}
    ${customerCardRow}
    ${messageRow}
    ${metaCardRow}
    ${screenshotRow}
    ${buildFooter({
      thankYouLine1: 'Thanks for keeping the app running smoothly.',
      thankYouLine2: 'This feedback was submitted by a customer.',
      shop: feedback.shop,
    })}
  `;

  const subject = `New feedback received${rating ? ` (${rating}★)` : ''}${
    shopName ? ` — ${shopName}` : ''
  }`;
  const htmlContent = wrapEmail(bodyRows, `New feedback from ${customerName}`);

  return { subject, htmlContent };
}

module.exports = { buildFeedbackEmail };
