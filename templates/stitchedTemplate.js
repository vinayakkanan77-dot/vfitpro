'use strict';

const {
  COLORS,
  escapeHtml,
  formatCurrency,
  buildLogoHeader,
  buildShopBadge,
  buildFooter,
  wrapEmail,
  resolveShopName,
} = require('./_shared');

/**
 * Picks the first defined, non-empty value for the given field names,
 * checking each of the provided source objects in order.
 */
function pickField(sources, fields) {
  for (const source of sources) {
    if (!source) continue;
    for (const field of fields) {
      const value = source[field];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
  }
  return undefined;
}

const DRESS_FIELDS = [
  'dress',
  'dressType',
  'dressName',
  'itemName',
  'garmentType',
  'category',
  'orderType',
  'type',
];

const AMOUNT_FIELDS = ['amount', 'total', 'price'];

/**
 * Normalizes every supported image shape (array of URLs, array of
 * {label,url} objects, or individual front/back fields under several
 * possible names) into a single ordered [{label,url}] list.
 */
function collectPhotos(sources, explicitImageUrls) {
  const defaultLabels = ['Front View', 'Back View'];
  const photos = [];
  const seenUrls = new Set();

  const pushEntry = (entry, fallbackIdx) => {
    if (!entry) return;
    let label;
    let url;
    if (typeof entry === 'string') {
      url = entry;
      label = defaultLabels[fallbackIdx] || `Photo ${fallbackIdx + 1}`;
    } else if (typeof entry === 'object') {
      url = entry.url || entry.src || entry.href;
      label = entry.label || defaultLabels[fallbackIdx] || `Photo ${fallbackIdx + 1}`;
    }
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    photos.push({ label, url });
  };

  // 1) Explicitly passed imageUrls param (backwards compatible entry point).
  if (Array.isArray(explicitImageUrls)) {
    explicitImageUrls.forEach((entry, idx) => pushEntry(entry, idx));
  }

  // 2) Array-style fields found on the customer/order documents.
  const arrayFields = ['stitchedImageUrls', 'stitchedImages', 'images'];
  for (const source of sources) {
    if (!source) continue;
    for (const field of arrayFields) {
      if (Array.isArray(source[field])) {
        source[field].forEach((entry, idx) => pushEntry(entry, idx));
      }
    }
  }

  // 3) Discrete front/back fields under any of the supported names.
  const frontFields = ['frontImageUrl', 'frontImage', 'frontPhoto'];
  const backFields = ['backImageUrl', 'backImage', 'backPhoto'];
  const front = pickField(sources, frontFields);
  const back = pickField(sources, backFields);
  if (front) pushEntry({ url: front, label: 'Front View' }, 0);
  if (back) pushEntry({ url: back, label: 'Back View' }, 1);

  return photos;
}

/**
 * Matches the "Order Ready / stitched photos" reference design:
 * logo header -> filled shop banner -> greeting -> ORDER DETAILS
 * (Customer / Dress / Amount, 3-column) -> pickup note -> YOUR ORDER
 * PHOTOS (front/back images) -> footer.
 *
 * @param {object} params
 * @param {object} params.customer Firestore customer doc data — needs `name`, `email`
 * @param {object} params.shop     Firestore shop doc data — needs `name`
 * @param {object} [params.order]  Optional Firestore order doc data, checked
 *                                 alongside `customer` for dress/amount/image fields
 * @param {string[]|{label:string,url:string}[]} [params.imageUrls]
 *        Cloudinary URLs already stored on the customer/order document.
 *        Plain strings default to "Front View" / "Back View" / "Photo N"
 *        labels in order; pass {label, url} objects for custom labels.
 * @param {string} [params.dress]  Garment name shown in the greeting, overrides auto-detection
 * @param {number} [params.amount] Order amount shown in ORDER DETAILS, overrides auto-detection
 */
function buildStitchedEmail({ customer, shop, order, imageUrls, dress, amount }) {
  const customerName = (customer && customer.name) || 'Customer';
  const sources = [{ dress }, customer, order];

  const dressName = dress || pickField([customer, order], DRESS_FIELDS) || 'garment';
  const orderAmount = Number(
    amount ?? pickField([customer, order], AMOUNT_FIELDS) ?? 0
  );
  const photos = collectPhotos([customer, order], imageUrls);

  const greetingRow = `
  <tr>
    <td style="padding:28px 28px 0 28px;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="52" valign="top">
            <div style="width:46px;height:46px;border-radius:50%;background:${COLORS.maroon};text-align:center;line-height:46px;">
              <span style="color:#ffffff;font-size:20px;">&#128100;</span>
            </div>
          </td>
          <td valign="top" style="padding-left:14px;">
            <div style="font-size:20px;color:${COLORS.text};font-weight:600;">
              Hello ${escapeHtml(customerName)}, &#128075;
            </div>
            <div style="font-size:15px;color:${COLORS.textMuted};margin-top:4px;line-height:1.55;">
              Great news — your <strong style="color:${COLORS.maroon};">${escapeHtml(
    dressName
  )}</strong> has been beautifully
              stitched and is now <strong style="color:${COLORS.maroon};">ready for pickup</strong>! &#127881;
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const orderDetailsRow = `
  <tr>
    <td style="padding:24px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:16px;">
        <tr>
          <td align="center" style="padding:18px 0 6px 0;">
            <span style="font-family:'Segoe UI',Arial,sans-serif;font-weight:700;font-size:14px;color:${COLORS.maroon};letter-spacing:1.2px;">
              &#128230; ORDER DETAILS
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 16px 22px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" align="center" style="font-family:'Segoe UI',Arial,sans-serif;">
                  <div style="width:40px;height:40px;line-height:40px;border-radius:50%;background:${COLORS.maroon};margin:0 auto;color:#fff;font-size:16px;">&#128100;</div>
                  <div style="font-size:12px;color:${COLORS.textMuted};margin-top:8px;letter-spacing:0.3px;">CUSTOMER</div>
                  <div style="font-size:14px;color:${COLORS.maroon};font-weight:700;margin-top:2px;">${escapeHtml(
    customerName
  )}</div>
                </td>
                <td width="33%" align="center" style="font-family:'Segoe UI',Arial,sans-serif;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
                  <div style="width:40px;height:40px;line-height:40px;border-radius:50%;background:${COLORS.maroon};margin:0 auto;color:#fff;font-size:16px;">&#128085;</div>
                  <div style="font-size:12px;color:${COLORS.textMuted};margin-top:8px;letter-spacing:0.3px;">DRESS</div>
                  <div style="font-size:14px;color:${COLORS.maroon};font-weight:700;margin-top:2px;">${escapeHtml(
    dressName
  )}</div>
                </td>
                <td width="33%" align="center" style="font-family:'Segoe UI',Arial,sans-serif;">
                  <div style="width:40px;height:40px;line-height:40px;border-radius:50%;background:${COLORS.maroon};margin:0 auto;color:#fff;font-size:16px;">&#128176;</div>
                  <div style="font-size:12px;color:${COLORS.textMuted};margin-top:8px;letter-spacing:0.3px;">AMOUNT</div>
                  <div style="font-size:14px;color:${COLORS.maroon};font-weight:700;margin-top:2px;">${formatCurrency(
    orderAmount
  )}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const pickupNoteRow = `
  <tr>
    <td style="padding:18px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${COLORS.pink};border-radius:14px;">
        <tr>
          <td style="padding:14px 18px;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:${COLORS.text};text-align:center;line-height:1.5;">
            &#128205; Please visit our shop at your convenience to collect your order.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const photosRow = photos.length
    ? `
  <tr>
    <td style="padding:26px 28px 0 28px;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-top:2px dashed ${COLORS.maroon};width:30%;line-height:0;font-size:0;">&nbsp;</td>
          <td style="white-space:nowrap;padding:0 12px;text-align:center;font-weight:700;font-size:13px;color:${COLORS.maroon};letter-spacing:1.2px;">
            &#128247; YOUR ORDER PHOTOS
          </td>
          <td style="border-top:2px dashed ${COLORS.maroon};width:30%;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${photos
            .map((photo, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === photos.length - 1;
              const padding = isFirst && isLast
                ? '0'
                : isFirst
                ? '0 8px 0 0'
                : isLast
                ? '0 0 0 8px'
                : '0 8px';
              return `
          <td width="${Math.floor(100 / photos.length)}%" style="padding:${padding};" valign="top">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
              <tr>
                <td align="center" style="padding:10px 0;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;color:${COLORS.text};border-bottom:1px solid ${COLORS.border};">
                  ${escapeHtml(photo.label)}
                </td>
              </tr>
              <tr>
                <td>
                  <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.label)}"
                       width="100%" style="display:block;width:100%;height:auto;" />
                </td>
              </tr>
            </table>
          </td>`;
            })
            .join('')}
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const bodyRows = `
    ${buildLogoHeader(shop)}
    ${buildShopBadge(shop, { filled: true })}
    ${greetingRow}
    ${orderDetailsRow}
    ${pickupNoteRow}
    ${photosRow}
    ${buildFooter({
      thankYouLine1: 'We appreciate your trust and',
      thankYouLine2: 'look forward to serving you again.',
      shop,
    })}
  `;

  const subject = `Your order is stitched and ready — ${resolveShopName(shop)}`;
  const htmlContent = wrapEmail(bodyRows, `Your ${dressName} is ready for pickup!`);

  return { subject, htmlContent };
}

module.exports = { buildStitchedEmail };
