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

const DATE_FIELDS = ['date', 'orderDate', 'deliveryDate', 'createdAt', 'dueDate'];

const AMOUNT_FIELDS = ['amount', 'total', 'price'];

function formatBillDate(rawDate) {
  if (!rawDate) return new Date().toLocaleDateString('en-IN');
  // Firestore Timestamp objects expose a toDate() method.
  if (typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
    return rawDate.toDate().toLocaleDateString('en-IN');
  }
  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-IN');
  }
  return String(rawDate);
}

/**
 * Matches the "Bill / Pay via UPI" reference design:
 * logo header -> shop badge -> greeting -> BILL DETAILS box
 * (Dress / Date / Amount) -> PAY SECURELY VIA UPI box -> footer.
 *
 * @param {object} params
 * @param {object} params.customer   Firestore customer doc data — needs `name`, `email`
 * @param {object} params.bill       Firestore bill doc data — needs dress/date/amount
 *                                    under any of the supported field names
 * @param {object} params.shop       Firestore shop doc data — needs `name`, `upiId`
 */
function buildBillEmail({ customer, bill, shop }) {
  const customerName = (customer && customer.name) || 'Customer';
  const dressName = pickField([bill], DRESS_FIELDS) || '—';
  const rawDate = pickField([bill], DATE_FIELDS);
  const billDate = formatBillDate(rawDate);
  const amount = Number(pickField([bill], AMOUNT_FIELDS) ?? 0);

  const shopName = resolveShopName(shop);
  const upiId = shop.upiId || shop.upi || '';
  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR`
    : '';

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
              Your stitching order is ready! Here's your bill summary below. &#127881;
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const billDetailsRow = `
  <tr>
    <td style="padding:24px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:16px;">
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:18px 0 18px 0;">
                  <span style="display:inline-block;background:${COLORS.maroon};color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;
                               font-weight:700;font-size:13px;letter-spacing:1.2px;border-radius:20px;padding:9px 24px;">
                    &#9673; BILL DETAILS &#9673;
                  </span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',Arial,sans-serif;">
              <tr>
                <td style="padding:12px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.text};">&#128085; Dress</td>
                <td style="padding:12px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:12px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.maroon};font-weight:700;text-align:right;">${escapeHtml(
    dressName
  )}</td>
              </tr>
              <tr>
                <td style="padding:12px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.text};">&#128197; Date</td>
                <td style="padding:12px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:12px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.maroon};font-weight:700;text-align:right;">${escapeHtml(
    billDate
  )}</td>
              </tr>
              <tr>
                <td style="padding:12px 22px 18px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.text};">&#8377; Amount</td>
                <td style="padding:12px 22px 18px 22px;border-top:1px solid ${COLORS.border};font-size:15px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:12px 22px 18px 22px;border-top:1px solid ${COLORS.border};font-size:18px;color:${COLORS.maroon};font-weight:700;text-align:right;">${formatCurrency(
    amount
  )}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const payRow = upiLink
    ? `
  <tr>
    <td style="padding:22px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:16px;background:${COLORS.pink};">
        <tr>
          <td align="center" style="padding:18px 0 6px 0;">
            <span style="display:inline-block;background:${COLORS.maroon};color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;
                         font-weight:700;font-size:13px;letter-spacing:1.2px;border-radius:20px;padding:9px 24px;">
              &#128274; PAY SECURELY VIA UPI
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px 4px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border:1px solid ${COLORS.border};border-radius:12px;">
              <tr>
                <td style="padding:16px 18px;font-family:'Segoe UI',Arial,sans-serif;">
                  <a href="${escapeHtml(upiLink)}"
                     style="color:${COLORS.maroon};font-size:14px;word-break:break-all;text-decoration:underline;">
                    &#128279; ${escapeHtml(upiLink)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 18px 18px 18px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
            &#128274; Tap the link above to pay securely with any UPI app
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const bodyRows = `
    ${buildLogoHeader(shop)}
    ${buildShopBadge(shop)}
    ${greetingRow}
    ${billDetailsRow}
    ${payRow}
    ${buildFooter({
      thankYouLine1: 'Your support means a lot to us.',
      thankYouLine2: 'We look forward to serving you again.',
      shop,
    })}
  `;

  const displayAmount = formatCurrency(amount).replace('&#8377;', '₹');
  const subject = `Your bill from ${shopName} — ${displayAmount}`;
  const htmlContent = wrapEmail(bodyRows, `Your stitching order is ready — ${displayAmount} due`);

  return { subject, htmlContent };
}

module.exports = { buildBillEmail };
