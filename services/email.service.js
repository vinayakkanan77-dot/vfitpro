'use strict';

const { db, admin } = require('../config/firebase');
const { sendTransactionalEmail } = require('../config/brevo');
const { COLLECTIONS } = require('../utils/constants');

const { buildBillEmail } = require('../templates/billTemplate');
const { buildStitchedEmail } = require('../templates/stitchedTemplate');
const { buildFeedbackEmail } = require('../templates/feedbackTemplate');

/**
 * -----------------------------------------
 * SEND BILL EMAIL
 * -----------------------------------------
 */
async function sendBillEmail({ customer, bill, shop, log }) {

  const { subject, htmlContent } = buildBillEmail({
    customer,
    bill,
    shop,
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

  log?.info('Firestore update: bill audit trail', {
    uid: customer.uid,
    billId: bill.id,
    messageId,
  });

  await db
    .collection(COLLECTIONS.USERS)
    .doc(customer.uid)
    .collection(COLLECTIONS.BILLS)
    .doc(bill.id)
    .set(
      {
        lastEmailSentAt:
          admin.firestore.FieldValue.serverTimestamp(),
        lastEmailMessageId: messageId,
      },
      { merge: true }
    );

  return messageId;
}

/**
 * -----------------------------------------
 * SEND STITCHED EMAIL
 * -----------------------------------------
 */
async function sendStitchedEmail({ customer, shop, log }) {

  const imageUrls = [];

  if (Array.isArray(customer.stitchedImageUrls)) {
    imageUrls.push(...customer.stitchedImageUrls.filter(Boolean));
  }

  [
    customer.frontImageUrl,
    customer.backImageUrl,
    customer.stitchedFrontImage,
    customer.stitchedBackImage,
    customer.frontUrl,
    customer.backUrl,
  ]
    .filter(Boolean)
    .forEach((url) => {
      if (!imageUrls.includes(url)) {
        imageUrls.push(url);
      }
    });

  const dress =
    customer.dress ||
    customer.dressType ||
    customer.itemName ||
    customer.dressName ||
    customer.orderType ||
    customer.category ||
    customer.type ||
    '';

  const amount =
    Number(
      customer.amount ??
      customer.total ??
      customer.price ??
      0
    );

  const { subject, htmlContent } = buildStitchedEmail({
    customer,
    shop,
    imageUrls,
    dress,
    amount,
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

  log?.info('Firestore update: customer audit trail', {
    uid: customer.uid,
    customerId: customer.id,
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
 * -----------------------------------------
 * SEND FEEDBACK EMAIL
 * -----------------------------------------
 */
async function sendFeedbackEmail({ feedback, log }) {

  const ownerEmail = process.env.OWNER_EMAIL;

  if (!ownerEmail) {
    const err = new Error(
      'OWNER_EMAIL is not configured on the server'
    );
    err.statusCode = 500;
    throw err;
  }

  const { subject, htmlContent } =
    buildFeedbackEmail({
      feedback,
    });

  const { messageId } =
    await sendTransactionalEmail({
      to: {
        email: ownerEmail,
        name: 'Shop Owner',
      },
      subject,
      htmlContent,
      log,
    });

  log?.info('Firestore update: feedback audit trail', {
    uid: feedback.uid,
    feedbackId: feedback.id,
    messageId,
  });

  if (feedback.uid) {
    await db
      .collection(COLLECTIONS.USERS)
      .doc(feedback.uid)
      .collection(COLLECTIONS.FEEDBACK)
      .doc(feedback.id)
      .set(
        {
          emailSent: true,
          lastEmailSentAt:
            admin.firestore.FieldValue.serverTimestamp(),
          lastEmailMessageId: messageId,
        },
        { merge: true }
      );
  }

  return messageId;
}

module.exports = {
  sendBillEmail,
  sendStitchedEmail,
  sendFeedbackEmail,
};
