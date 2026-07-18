'use strict';

const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Shop information is stored directly in:
 * users/{uid}
 */
async function getShopByUid(uid, log) {
  log?.info('Firestore read: shop', { uid });

  const snap = await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .get();

  if (!snap.exists) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  };
}

module.exports = {
  getShopByUid,
};
