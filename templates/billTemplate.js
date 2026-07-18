'use strict';

/**
 * NOTE: The task said "reuse existing HTML templates, do NOT rewrite
 * templates." This file is a placeholder that reproduces the same shape
 * your Cloud Function likely used (customer name, shop name, items,
 * total, due date). Paste your existing HTML/CSS from the Cloud Function
 * source into the `body` string below and the rest of the backend will
 * work unchanged — only the data-binding contract (the fields passed in)
 * matters to the rest of the app.
 */

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
  return `₹${n.toFixed(2)}`;
}

/**
 * @param {object} params
 * @param {object} params.customer Firestore customer doc data
 * @param {object} params.bill Firestore bill doc data
 * @param {object} params.shop Firestore shop doc data
 */
function buildBillEmail({ customer, bill, shop }) {
  const items = Array.isArray(bill.items) ? bill.items : [];

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${escapeHtml(item.quantity ?? 1)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.amount)}</td>
      </tr>`
    )
    .join('');

  const subject = `Your bill from ${shop.name || 'VFitPro'}`;

  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
    <h2 style="color:#2b2b2b;">${escapeHtml(shop.name || 'VFitPro')}</h2>
    <p>Hi ${escapeHtml(customer.name || 'Customer')},</p>
    <p>Here is your bill summary${bill.id ? ` (Bill #${escapeHtml(bill.id)})` : ''}.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;">Item</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right;font-size:16px;"><strong>Total: ${formatCurrency(bill.total)}</strong></p>
    ${bill.dueDate ? `<p>Due date: ${escapeHtml(bill.dueDate)}</p>` : ''}
    <p style="margin-top:24px;">Thank you for choosing ${escapeHtml(shop.name || 'us')}.</p>
    ${shop.phone ? `<p style="color:#777;font-size:12px;">Contact: ${escapeHtml(shop.phone)}</p>` : ''}
  </div>`;

  return { subject, htmlContent };
}

module.exports = { buildBillEmail };
