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
 * Matches the "Bill / Pay via UPI" reference design:
 * logo header -> shop badge -> greeting -> BILL DETAILS box
 * (Dress / Date / Amount) -> PAY SECURELY VIA UPI box -> footer.
 *
 * @param {object} params
 * @param {object} params.customer   Firestore customer doc data — needs `name`, `email`
 * @param {object} params.bill       Firestore bill doc data — needs `dress` (or `itemName`),
 *                                    `date`, `amount`
 * @param {object} params.shop       Firestore shop doc data — needs `name`, `upiId`
 */
function buildBillEmail({ customer, bill, shop }) {
  const customerName = customer.name || 'Customer';
  const dressName = bill.dress || bill.itemName || bill.dressType || '—';
  const billDate = bill.date || bill.dueDate || new Date().toLocaleDateString('en-IN');
  const amount = Number(bill.amount ?? bill.total ?? 0);

  const upiId = shop.upiId || shop.upi || '';
  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shop.name || 'VFitPro')}&am=${amount}&cu=INR`
    : '';

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
            <div style="font-size:16px;color:${COLORS.text};margin-top:2px;">
              Your stitching order is ready! &#127881;
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  const billDetailsRow = `
  <tr>
    <td style="padding:20px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:14px;">
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:14px 0 16px 0;">
                  <span style="display:inline-block;background:${COLORS.maroon};color:#ffffff;font-family:Arial,sans-serif;
                               font-weight:bold;font-size:14px;letter-spacing:1px;border-radius:20px;padding:8px 22px;">
                    &#9673; BILL DETAILS &#9673;
                  </span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
              <tr>
                <td style="padding:10px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.text};">&#128085; Dress</td>
                <td style="padding:10px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:10px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.maroon};font-weight:bold;text-align:right;">${escapeHtml(dressName)}</td>
              </tr>
              <tr>
                <td style="padding:10px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.text};">&#128197; Date</td>
                <td style="padding:10px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:10px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.maroon};font-weight:bold;text-align:right;">${escapeHtml(billDate)}</td>
              </tr>
              <tr>
                <td style="padding:10px 20px 16px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.text};">&#8377; Amount</td>
                <td style="padding:10px 20px 16px 20px;border-top:1px solid ${COLORS.border};font-size:16px;color:${COLORS.textMuted};text-align:center;width:24px;">:</td>
                <td style="padding:10px 20px 16px 20px;border-top:1px solid ${COLORS.border};font-size:18px;color:${COLORS.maroon};font-weight:bold;text-align:right;">${formatCurrency(amount)}</td>
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
    <td style="padding:20px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${COLORS.border};border-radius:14px;background:${COLORS.pink};">
        <tr>
          <td align="center" style="padding:14px 0 4px 0;">
            <span style="display:inline-block;background:${COLORS.maroon};color:#ffffff;font-family:Arial,sans-serif;
                         font-weight:bold;font-size:14px;letter-spacing:1px;border-radius:20px;padding:8px 22px;">
              &#128274; PAY SECURELY VIA UPI
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px 4px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border:1px solid ${COLORS.border};border-radius:12px;">
              <tr>
                <td style="padding:14px 16px;font-family:Arial,sans-serif;">
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
          <td align="center" style="padding:6px 16px 16px 16px;font-family:Arial,sans-serif;font-size:12px;color:${COLORS.textMuted};">
            &#128274; Tap the link to pay securely with any UPI App
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : '';

  const bodyRows = `
    ${buildLogoHeader()}
    ${buildShopBadge(shop.name)}
    ${greetingRow}
    ${billDetailsRow}
    ${payRow}
    ${buildFooter({
      thankYouLine1: 'Your support means a lot to us.',
      thankYouLine2: 'We look forward to serving you again.',
    })}
  `;

  const displayAmount = formatCurrency(amount).replace('&#8377;', '₹');
  const subject = `Your bill from ${shop.name || 'VFitPro'} — ${displayAmount}`;
  const htmlContent = wrapEmail(bodyRows, `Your stitching order is ready — ${displayAmount} due`);

  return { subject, htmlContent };
}

module.exports = { buildBillEmail };
