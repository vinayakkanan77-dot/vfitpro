'use strict';

const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * @param {string} customerId
 * @param {object} [log]
 * @returns {Promise<object|null>} customer data with id, or null if not found
 */
async function getCustomerById(customerId, log) {
  log?.info('Firestore read: customer', { customerId });
  const snap = await db.collection(COLLECTIONS.CUSTOMERS).doc(customerId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = { getCustomerById };
