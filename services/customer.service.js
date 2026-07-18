'use strict';

const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Get customer from:
 * users/{uid}/customers/{customerId}
 */
async function getCustomerById(uid, customerId, log) {
  log?.info('Firestore read: customer', { uid, customerId });

  const snap = await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .collection(COLLECTIONS.CUSTOMERS)
    .doc(customerId)
    .get();

  if (!snap.exists) {
    log?.warn('Customer not found', { uid, customerId });
    return null;
  }

  return {
    id: snap.id,
    ...snap.data()
  };
}

module.exports = {
  getCustomerById
};
