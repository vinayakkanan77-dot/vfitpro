'use strict';

const { db, admin } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Read bill from:
 * users/{uid}/bills/{billId}
 */
async function getBillById(uid, billId, log) {
  log?.info('Firestore read: bill', { uid, billId });

  const snap = await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .collection(COLLECTIONS.BILLS)
    .doc(billId)
    .get();

  if (!snap.exists) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  };
}

async function markBillEmailSent(uid, billId, messageId, log) {
  log?.info('Firestore update: bill emailSent flag', {
    uid,
    billId,
    messageId,
  });

  await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
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

module.exports = {
  getBillById,
  markBillEmailSent,
};
