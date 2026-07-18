'use strict';

const { db, admin } = require('../config/firebase');
const { sendTransactionalEmail } = require('../config/brevo');
const { COLLECTIONS } = require('../utils/constants');
const { buildBillEmail } = require('../templates/billTemplate');
const { buildStitchedEmail } = require('../templates/stitchedTemplate');
const { buildFeedbackEmail } = require('../templates/feedbackTemplate');

/**
 * Sends the bill email and returns the Brevo messageId.
 */
async function sendBillEmail({ customer, bill, shop, log }) {
  const { subject, htmlContent } = buildBillEmail({ customer, bill, shop });

  const { messageId } = await sendTransactionalEmail({
    to: { email: customer.email, name: customer.name },
    subject,
    htmlContent,
    log,
  });

  log?.info('Firestore update: bill audit trail', { billId: bill.id, messageId });
  await db
    .collection(COLLECTIONS.BILLS)
    .doc(bill.id)
    .set(
      { lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(), lastEmailMessageId: messageId },
      { merge: true }
    );

  return messageId;
}

/**
 * Sends the "order stitched" email with Cloudinary image URLs already
 * present on the customer document (Android uploads images directly to
 * Cloudinary; this service never touches Cloudinary itself).
 */
async function sendStitchedEmail({ customer, shop, log }) {
  const imageUrls = Array.isArray(customer.stitchedImageUrls)
    ? customer.stitchedImageUrls
    : [];

  const { subject, htmlContent } = buildStitchedEmail({
    customer,
    shop,
    imageUrls,
  });

  const { messageId } = await sendTransactionalEmail({
    to: {
      email: customer.email,
      name: customer.name,
    },
    subject,
    htmlContent,
    log,
  });

  log?.info("Firestore update: customer audit trail", {
    customerId: customer.id,
    uid: customer.uid,
    messageId,
  });

  await db
    .collection(COLLECTIONS.USERS)
    .doc(customer.uid)
    .collection(COLLECTIONS.CUSTOMERS)
    .doc(customer.id)
    .set(
      {
        lastStitchedEmailSentAt:
          admin.firestore.FieldValue.serverTimestamp(),
        lastStitchedEmailMessageId: messageId,
      },
      { merge: true }
    );

  return messageId;
}
/**
 * Sends feedback content to the shop owner's inbox.
 */
async function sendFeedbackEmail({ feedback, log }) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    const err = new Error('OWNER_EMAIL is not configured on the server');
    err.statusCode = 500;
    throw err;
  }

  const { subject, htmlContent } = buildFeedbackEmail({ feedback });

  const { messageId } = await sendTransactionalEmail({
    to: { email: ownerEmail },
    subject,
    htmlContent,
    log,
  });

  log?.info('Firestore update: feedback audit trail', { feedbackId: feedback.id, messageId });
  await db
    .collection(COLLECTIONS.FEEDBACK)
    .doc(feedback.id)
    .set(
      { lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(), lastEmailMessageId: messageId },
      { merge: true }
    );

  return messageId;
}

module.exports = { sendBillEmail, sendStitchedEmail, sendFeedbackEmail };
