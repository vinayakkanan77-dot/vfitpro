async function sendStitchedEmail({ customer, uid, shop, log }) {
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

  log?.info('Firestore update: customer audit trail', {
    uid,
    customerId: customer.id,
    messageId,
  });

  await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
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
