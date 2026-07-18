'use strict';

/**
 * Shared look-and-feel for every VFitPro transactional email: colors,
 * the logo header, shop badge, footer, and outer wrapper. All email
 * templates (billTemplate.js, stitchedTemplate.js, feedbackTemplate.js)
 * import from here so they stay visually consistent — change it once,
 * here.
 *
 * === LOGO ===
 * The logo is now resolved dynamically, per shop, from the shop
 * document passed into buildLogoHeader(shop). Supported fields (first
 * match wins): shop.logoUrl, shop.logo, shop.shopLogo, shop.image,
 * shop.imageUrl.
 *
 * Email clients load images over HTTPS — they can't reach a file
 * sitting in this project's folder — so whatever URL lands in one of
 * those fields must already be a public HTTPS URL (e.g. a Cloudinary
 * secure_url).
 *
 * If no shop is passed, or none of those fields resolve to a URL, the
 * header falls back to the legacy LOGO_URL env var, and if that's also
 * empty it renders a premium circular placeholder with the shop's
 * initials instead of ever showing a broken image icon.
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
 * Resolves the shop's display name from any of the supported Firestore
 * field names. Accepts either a shop object or an already-resolved
 * string (so existing call sites that pass shop.name directly keep
 * working). Never falls back to an owner name — only the brand default.
 */
function resolveShopName(shopOrName) {
  if (!shopOrName) return BRAND_NAME;
  if (typeof shopOrName === 'string') return shopOrName.trim() || BRAND_NAME;
  const name =
    shopOrName.name || shopOrName.shopName || shopOrName.businessName || shopOrName.storeName;
  return name && String(name).trim() ? String(name).trim() : BRAND_NAME;
}

/** Resolves the shop's logo URL from any of the supported field names. */
function resolveShopLogoUrl(shop) {
  if (!shop || typeof shop !== 'object') return '';
  return shop.logoUrl || shop.logo || shop.shopLogo || shop.image || shop.imageUrl || '';
}

function resolveShopPhone(shop) {
  if (!shop || typeof shop !== 'object') return '';
  return shop.phone || shop.mobile || shop.contact || '';
}

function resolveShopEmail(shop) {
  if (!shop || typeof shop !== 'object') return '';
  return shop.email || shop.contactEmail || '';
}

function resolveShopAddress(shop) {
  if (!shop || typeof shop !== 'object') return '';
  return shop.address || shop.location || '';
}

/** First one or two letters of a name, used for the logo placeholder. */
function getInitials(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'VF';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Top-of-email header: premium centered logo (dynamic per shop, with a
 * circular initials placeholder when no logo is available), wordmark,
 * and tagline.
 *
 * @param {object} [shop] Firestore shop doc data. Optional — if omitted
 *   the header falls back to the legacy LOGO_URL env var / placeholder.
 */
function buildLogoHeader(shop) {
  const shopName = resolveShopName(shop);
  const logoUrl = resolveShopLogoUrl(shop) || LOGO_URL;
  const initials = getInitials(shopName);

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="90" height="90" alt="${escapeHtml(shopName)}"
         style="display:block;margin:0 auto;width:90px;height:90px;min-width:90px;min-height:90px;
                border-radius:50%;border:3px solid ${COLORS.maroon};background:#ffffff;
                object-fit:contain;box-shadow:0 4px 14px rgba(163,21,21,0.18);" />`
    : `<div style="width:90px;height:90px;line-height:90px;margin:0 auto;border-radius:50%;
         border:3px solid ${COLORS.maroon};background:#ffffff;color:${COLORS.maroon};
         font-family:'Segoe UI',Arial,sans-serif;font-weight:bold;font-size:30px;text-align:center;
         box-shadow:0 4px 14px rgba(163,21,21,0.18);">
         ${escapeHtml(initials)}
       </div>`;

  return `
  <tr>
    <td style="padding:34px 24px 10px 24px;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            ${logoBlock}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:16px;font-family:Georgia,'Times New Roman',serif;
                     font-weight:bold;font-size:30px;letter-spacing:1.5px;color:${COLORS.maroon};">
            ${escapeHtml(BRAND_NAME)}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:4px;font-family:'Segoe UI',Arial,sans-serif;
                     font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};">
            ${escapeHtml(BRAND_TAGLINE)}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/**
 * The pill-shaped shop-name badge under the header, e.g. "🏬 vfit pro".
 * `filled` matches the solid maroon banner style used in the stitched
 * email; the default (outline) matches the bill email.
 *
 * @param {object|string} shopOrName Either the shop doc (name resolved
 *   from name/shopName/businessName/storeName) or an already-resolved
 *   name string, for backward compatibility with existing call sites.
 * @param {object} [options]
 * @param {boolean} [options.filled=false]
 */
function buildShopBadge(shopOrName, { filled = false } = {}) {
  const name = escapeHtml(resolveShopName(shopOrName));

  if (filled) {
    return `
    <tr>
      <td style="padding:16px 24px 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:${COLORS.maroon};border-radius:16px;padding:16px 14px;text-align:center;
                       font-family:'Segoe UI',Arial,sans-serif;font-size:21px;font-weight:700;color:#ffffff;
                       box-shadow:0 3px 10px rgba(163,21,21,0.22);">
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
                     font-family:'Segoe UI',Arial,sans-serif;font-size:19px;font-weight:700;
                     color:${COLORS.maroon};background:${COLORS.cream};">
            &#127978; ${name}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/**
 * Bottom "Thank you" block + contact details + "Powered by VFITPRO"
 * footer line.
 *
 * @param {object} params
 * @param {string} params.thankYouLine1
 * @param {string} params.thankYouLine2
 * @param {object} [params.shop] Optional shop doc — if provided, phone/
 *   email/address are shown when present and silently omitted otherwise.
 */
function buildFooter({ thankYouLine1, thankYouLine2, shop } = {}) {
  const phone = resolveShopPhone(shop);
  const email = resolveShopEmail(shop);
  const address = resolveShopAddress(shop);

  const contactParts = [
    phone ? `&#128222; ${escapeHtml(phone)}` : '',
    email ? `&#9993; ${escapeHtml(email)}` : '',
  ].filter(Boolean);

  const contactLine = contactParts.length
    ? `
            <div style="font-size:12.5px;color:${COLORS.textMuted};margin-top:10px;line-height:1.6;">
              ${contactParts.join('&nbsp;&nbsp;&#8226;&nbsp;&nbsp;')}
            </div>`
    : '';

  const addressLine = address
    ? `
            <div style="font-size:12.5px;color:${COLORS.textMuted};margin-top:4px;line-height:1.6;">
              &#128205; ${escapeHtml(address)}
            </div>`
    : '';

  return `
  <tr>
    <td style="padding:24px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${COLORS.pink};border:1px solid ${COLORS.border};border-radius:16px;">
        <tr>
          <td align="center" style="padding:20px 22px;font-family:'Segoe UI',Arial,sans-serif;color:${COLORS.text};">
            <div style="font-size:16px;font-weight:700;color:${COLORS.maroonDark};">
              Thank you for choosing vfit pro! &#10084;&#65039;
            </div>
            <div style="font-size:13px;color:${COLORS.textMuted};margin-top:8px;line-height:1.55;">
              ${escapeHtml(thankYouLine1)}<br />${escapeHtml(thankYouLine2)}
            </div>
            ${contactLine}
            ${addressLine}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:18px 24px 32px 24px;text-align:center;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${COLORS.textMuted};">
      &#10024; Powered by <strong style="color:${COLORS.maroon};">${escapeHtml(BRAND_NAME)}</strong> &#10024;
    </td>
  </tr>`;
}

/**
 * Outer email wrapper: soft page background, centered premium card with
 * rounded corners, a subtle shadow, and a mobile-friendly max width.
 */
function wrapEmail(bodyRowsHtml, previewText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(BRAND_NAME)}</title>
<style>
  @media only screen and (max-width: 650px) {
    .vfp-container { width:100% !important; max-width:100% !important; border-radius:0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f3ecec;">
  <span style="display:none;font-size:1px;color:#f3ecec;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(previewText || '')}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ecec;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="650" cellpadding="0" cellspacing="0" class="vfp-container"
               style="width:650px;max-width:650px;background:#ffffff;border:1px solid ${COLORS.border};
                      border-radius:22px;overflow:hidden;box-shadow:0 8px 28px rgba(163,21,21,0.10);">
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
  resolveShopName,
  resolveShopLogoUrl,
  resolveShopPhone,
  resolveShopEmail,
  resolveShopAddress,
};
