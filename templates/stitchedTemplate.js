'use strict';

const {
  COLORS,
  escapeHtml,
  formatCurrency,
  buildLogoHeader,
  buildShopBadge,
  buildFooter,
  wrapEmail,
} = require('./_shared');

/**
 * Matches the "Order Ready / stitched photos" reference design:
 * logo header -> filled shop banner -> greeting -> ORDER DETAILS
 * (Customer / Dress / Amount, 3-column) -> pickup note -> YOUR ORDER
 * PHOTOS (front/back images) -> footer.
 *
 * @param {object} params
 * @param {object} params.customer Firestore customer doc data — needs `name`, `email`
 * @param {object} params.shop     Firestore shop doc data — needs `name`
 * @param {string[]|{label:string,url:string}[]} params.imageUrls
 *        Cloudinary URLs already stored on the customer/order document.
 *        Plain strings default to "Front View" / "Back View" / "Photo N"
 *        labels in order; pass {label, url} objects for custom labels.
 * @param {string} [params.dress]  Garment name shown in the greeting, e.g. "shirt"
 * @param {number} [params.amount] Order amount shown in ORDER DETAILS
 */
function buildStitchedEmail({ customer, shop, imageUrls, dress, amount }) {
  const customerName = customer.name || 'Customer';
  const dressName = dress || customer.dress || customer.dressType || 'garment';
  const orderAmount = Number(amount ?? customer.amount ?? 0);

  const defaultLabels = ['Front View', 'Back View'];
  const photos = (Array.isArray(imageUrls) ? imageUrls : [])
    .filter(Boolean)
    .map((entry, idx) => {
      if (typeof entry === 'string') {
        return { label: defaultLabels[idx] || `Photo ${idx + 1}`, url: entry };
      }
      return { label: entry.label || defaultLabels[idx] || `Photo ${idx + 1}`, url: entry.url };
    });

  const greetingRow = `
  <tr>
    <td style="padding:22px 24px 0 24px;font-family:Arial,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="52" valign="top">
            <div style="width:44px;height:44px;border-radius:50%;background:${COLORS.maroon};text-align:center;line-height:44px;">
              <span style="color:#ffffff;font-size:20px;">&#128100;</span>
            </div>
          </td>
          <td valign="top" style="padding-left:10px;">
            <div style="font-size:19px;color:${COLORS.text};">
              Hello <strong style="color:${COLORS.maroon};">${escapeHtml(customerName)}</strong>, &#128075;
            </div>
            <div style="font-size:16px;color:${COLORS.text};margin-top:2px;line-height:1.4;">
              Your <strong style="color:${COLORS.maroon};">${escapeHtml(dressName)}</strong> has been beautifully
              stitched and is now <strong style="color:${COLORS.maroon};">ready for pickup</strong>! &#127881;
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const orderDetailsRow = `
  <tr>
    <td style="padding:20px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:14px;">
        <tr>
          <td align="center" style="padding:14px 0 4px 0;">
            <span style="font-family:Arial,sans-serif;font-weight:bold;font-size:15px;color:${COLORS.maroon};letter-spacing:1px;">
              &#128230; ORDER DETAILS
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 12px 18px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" align="center" style="font-family:Arial,sans-serif;">
                  <div style="width:38px;height:38px;line-height:38px;border-radius:50%;background:${COLORS.maroon};margin:0 auto;color:#fff;font-size:16px;">&#128100;</div>
                  <div style="font-size:13px;color:${COLORS.text};margin-top:6px;">Customer</div>
                  <div style="font-size:14px;color:${COLORS.maroon};font-weight:bold;">${escapeHtml(customerName)}</div>
                </td>
                <td width="33%" align="center" style="font-family:Arial,sans-serif;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
                  <div style="width:38px;height:38px;line-height:38px;border-radius:50%;background:${COLORS.maroon};margin:0 auto;color:#fff;font-size:16px;">&#128085;</div>
                  <div style="font-size:13px;color:${COLORS.text};margin-top:6px;">Dress</div>
                  <div style="font-size:14px;color:${COLORS.maroon};font-weight:bold;">${escapeHtml(dressName)}</div>
                </td>
                <td width="33%" align="center" style="font-family:Arial,sans-serif;">
                  <div style="width:38px;height:38px;line-height:38px;border-radius:50%;background:${COLORS.maroon};margin:0 auto;color:#fff;font-size:16px;">&#128176;</div>
                  <div style="font-size:13px;color:${COLORS.text};margin-top:6px;">Amount</div>
                  <div style="font-size:14px;color:${COLORS.maroon};font-weight:bold;">${formatCurrency(orderAmount)}</div>
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
    <td style="padding:16px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${COLORS.pink};border-radius:12px;">
        <tr>
          <td style="padding:12px 16px;font-family:Arial,sans-serif;font-size:14px;color:${COLORS.text};text-align:center;">
            &#128205; Please visit our shop at your convenience to collect your order.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const photosRow = photos.length
    ? `
  <tr>
    <td style="padding:22px 24px 0 24px;font-family:Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-top:2px dashed ${COLORS.maroon};width:30%;line-height:0;font-size:0;">&nbsp;</td>
          <td style="white-space:nowrap;padding:0 10px;text-align:center;font-weight:bold;font-size:14px;color:${COLORS.maroon};letter-spacing:1px;">
            &#128247; YOUR ORDER PHOTOS
          </td>
          <td style="border-top:2px dashed ${COLORS.maroon};width:30%;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${photos
            .map(
              (photo, idx) => `
          <td width="${Math.floor(100 / photos.length)}%" style="padding:${idx === 0 ? '0 8px 0 0' : '0 0 0 8px'};" valign="top">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid ${COLORS.border};border-radius:12px;overflow:hidden;">
              <tr>
                <td align="center" style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:${COLORS.text};border-bottom:1px solid ${COLORS.border};">
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
          </td>`
            )
            .join('')}
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const bodyRows = `
    ${buildLogoHeader()}
    ${buildShopBadge(shop.name, { filled: true })}
    ${greetingRow}
    ${orderDetailsRow}
    ${pickupNoteRow}
    ${photosRow}
    ${buildFooter({
      thankYouLine1: 'We appreciate your trust and',
      thankYouLine2: 'look forward to serving you again.',
    })}
  `;

  const subject = `Your order is stitched and ready — ${shop.name || 'VFitPro'}`;
  const htmlContent = wrapEmail(bodyRows, `Your ${dressName} is ready for pickup!`);

  return { subject, htmlContent };
}

module.exports = { buildStitchedEmail };
