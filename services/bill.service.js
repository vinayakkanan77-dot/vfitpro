'use strict';

const { db, admin } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * @param {string} billId
 * @param {object} [log]
 * @returns {Promise<object|null>}
 */
async function getBillById(billId, log) {
  log?.info('Firestore read: bill', { billId });
  const snap = await db.collection(COLLECTIONS.BILLS).doc(billId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Marks a bill as emailed. Android already handles the primary Firestore
 * update after a successful API response (per the spec), but we also
 * stamp a server-side audit trail so "was this actually sent" never
 * depends solely on the client completing its own follow-up write.
 *
 * @param {string} billId
 * @param {string} messageId Brevo message id
 * @param {object} [log]
 */
async function markBillEmailSent(billId, messageId, log) {
  log?.info('Firestore update: bill emailSent flag', { billId, messageId });
  await db
    .collection(COLLECTIONS.BILLS)
    .doc(billId)
    .set(
      {
        lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastEmailMessageId: messageId,
      },
      { merge: true }
    );
}

module.exports = { getBillById, markBillEmailSent };
