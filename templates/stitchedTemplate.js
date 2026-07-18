'use strict';

/**
 * Same note as billTemplate.js — drop your existing HTML here verbatim.
 * This preserves the same data contract: customer + shop + a list of
 * Cloudinary image URLs already stored on the customer/order document.
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

/**
 * @param {object} params
 * @param {object} params.customer Firestore customer doc data
 * @param {object} params.shop Firestore shop doc data
 * @param {string[]} params.imageUrls Cloudinary URLs already uploaded by Android
 */
function buildStitchedEmail({ customer, shop, imageUrls }) {
  const urls = Array.isArray(imageUrls) ? imageUrls : [];

  const gallery = urls
    .map(
      (url) => `
      <td style="padding:4px;">
        <img src="${escapeHtml(url)}" alt="Stitched garment" style="width:160px;height:160px;object-fit:cover;border-radius:8px;" />
      </td>`
    )
    .join('');

  const subject = `Your order is stitched and ready — ${shop.name || 'VFitPro'}`;

  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
    <h2 style="color:#2b2b2b;">${escapeHtml(shop.name || 'VFitPro')}</h2>
    <p>Hi ${escapeHtml(customer.name || 'Customer')},</p>
    <p>Great news — your garment has been stitched! Here's a preview:</p>
    <table><tr>${gallery}</tr></table>
    <p style="margin-top:24px;">Please visit the shop to collect your order at your convenience.</p>
    ${shop.phone ? `<p style="color:#777;font-size:12px;">Contact: ${escapeHtml(shop.phone)}</p>` : ''}
  </div>`;

  return { subject, htmlContent };
}

module.exports = { buildStitchedEmail };
