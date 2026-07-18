'use strict';

/**
 * Shared look-and-feel for every VFitPro transactional email: colors,
 * the logo header, and the footer. Both billTemplate.js and
 * stitchedTemplate.js import from here so the two emails stay visually
 * consistent if you tweak colors or the logo later — change it once,
 * here.
 *
 * === WHERE TO PUT YOUR LOGO ===
 * Email clients (Gmail, Outlook, the stock Android mail app, etc.) load
 * images over HTTPS — they can't reach a file sitting in this project's
 * folder. So the logo has to be hosted somewhere with a public URL.
 * Two options, pick whichever is easiest:
 *
 *   1) Cloudinary (you already use it for garment photos):
 *      Upload logo.png to your existing Cloudinary account, copy the
 *      "secure_url" it gives you, and set it as LOGO_URL below.
 *
 *   2) This backend, as a static file:
 *      Put your logo file at backend/public/logo.png (create the
 *      "public" folder if it doesn't exist yet), then set
 *        LOGO_URL=https://your-service.onrender.com/public/logo.png
 *      server.js already serves backend/public/ at the /public path —
 *      see the "app.use('/public', ...)" line.
 *
 * Either way, set LOGO_URL as an environment variable (.env locally,
 * Render's Environment tab in production). If LOGO_URL is left empty,
 * the templates fall back to a plain text "VFITPRO" wordmark so emails
 * never ship with a broken-image icon.
 */

const COLORS = {
  maroon: '#A31515',
  maroonDark: '#8B0000',
  text: '#2b2020',
  textMuted: '#7a6a6a',
  cream: '#FFFBFA',
  pink: '#FDEEEC',
  border: '#E9C9C6',
};

const LOGO_URL = process.env.LOGO_URL || '';
const BRAND_NAME = process.env.BRAND_NAME || 'VFITPRO';
const BRAND_TAGLINE = process.env.BRAND_TAGLINE || 'SEWING MADE SIMPLE';

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `&#8377;${n.toFixed(2)}`; // ₹
}

/** Small red "sewing button" dot used as a decorative divider accent. */
function buttonIcon(size = 14) {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${COLORS.maroon};vertical-align:middle;"></span>`;
}

/** Dashed horizontal rule matching the stitched-thread motif in the design. */
function dashedRule() {
  return `<div style="border-top:2px dashed ${COLORS.maroon};line-height:0;font-size:0;">&nbsp;</div>`;
}

/**
 * Top-of-email header: circular logo (or text fallback), wordmark, and
 * tagline — matches the top block of both reference designs.
 */
function buildLogoHeader() {
  const logoBlock = LOGO_URL
    ? `<img src="${escapeHtml(LOGO_URL)}" width="110" height="110" alt="${escapeHtml(BRAND_NAME)}"
         style="display:block;margin:0 auto;border-radius:50%;border:3px solid ${COLORS.maroon};background:#ffffff;object-fit:cover;" />`
    : `<div style="width:104px;height:104px;line-height:104px;margin:0 auto;border-radius:50%;border:3px dashed ${COLORS.maroon};
         background:#ffffff;color:${COLORS.maroon};font-family:Arial,sans-serif;font-weight:bold;font-size:22px;text-align:center;">
         VFP
       </div>`;

  return `
  <tr>
    <td style="padding:28px 24px 6px 24px;text-align:center;">
      ${logoBlock}
      <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:34px;letter-spacing:2px;color:${COLORS.maroon};">
        ${escapeHtml(BRAND_NAME)}
      </div>
      <div style="margin-top:2px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;color:${COLORS.text};">
        ${escapeHtml(BRAND_TAGLINE)}
      </div>
    </td>
  </tr>`;
}

/**
 * The pill-shaped shop-name badge under the header, e.g. "🏬 vfit pro".
 * `filled` matches the solid maroon banner style used in the stitched
 * email; the default (outline) matches the bill email.
 */
function buildShopBadge(shopName, { filled = false } = {}) {
  const name = escapeHtml(shopName || 'VFitPro');
  if (filled) {
    return `
    <tr>
      <td style="padding:14px 24px 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:${COLORS.maroon};border-radius:14px;padding:16px 12px;text-align:center;
                       font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;">
              &#127978; ${name}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  return `
  <tr>
    <td style="padding:18px 24px 0 24px;text-align:center;">
      <table role="presentation" align="center" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border:2px solid ${COLORS.maroon};border-radius:24px;padding:10px 28px;
                     font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:${COLORS.maroon};background:${COLORS.cream};">
            &#127978; ${name}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/** Bottom "Thank you" block + "Powered by VFITPRO" footer line. */
function buildFooter({ thankYouLine1, thankYouLine2 }) {
  return `
  <tr>
    <td style="padding:20px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${COLORS.pink};border:1px solid ${COLORS.border};border-radius:14px;">
        <tr>
          <td style="padding:18px 20px;font-family:Arial,sans-serif;color:${COLORS.text};">
            <div style="font-size:16px;font-weight:bold;color:${COLORS.maroonDark};">
              Thank you for choosing vfit pro! &#10084;&#65039;
            </div>
            <div style="font-size:13px;color:${COLORS.textMuted};margin-top:6px;line-height:1.5;">
              ${escapeHtml(thankYouLine1)}<br />${escapeHtml(thankYouLine2)}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 28px 24px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:${COLORS.textMuted};">
      &#10024; Powered by <strong style="color:${COLORS.maroon};">${escapeHtml(BRAND_NAME)}</strong> &#10024;
    </td>
  </tr>`;
}

/** Outer email wrapper: white page, centered card with a rounded maroon border. */
function wrapEmail(bodyRowsHtml, previewText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(BRAND_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:#f3ecec;">
  <span style="display:none;font-size:1px;color:#f3ecec;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(previewText || '')}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ecec;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="width:600px;max-width:600px;background:${COLORS.cream};border:4px solid ${COLORS.maroon};border-radius:18px;overflow:hidden;">
          ${bodyRowsHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  COLORS,
  LOGO_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
  escapeHtml,
  formatCurrency,
  buttonIcon,
  dashedRule,
  buildLogoHeader,
  buildShopBadge,
  buildFooter,
  wrapEmail,
};
