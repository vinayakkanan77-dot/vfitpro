'use strict';

const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Shops are keyed by the owning user's uid (the Firebase Auth uid), which
 * matches how the existing Cloud Functions resolved "which shop is this
 * request for" from the caller's auth context.
 *
 * @param {string} uid
 * @param {object} [log]
 * @returns {Promise<object|null>}
 */
async function getShopByUid(uid, log) {
  log?.info('Firestore read: shop', { uid });
  const snap = await db.collection(COLLECTIONS.SHOPS).doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = { getShopByUid };
