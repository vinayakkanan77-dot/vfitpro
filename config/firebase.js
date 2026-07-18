'use strict';

const admin = require('firebase-admin');
const logger = require('./logger');

/**
 * Initializes Firebase Admin using environment variables only
 * (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).
 * This mirrors exactly what the existing Firebase Cloud Functions had
 * implicit access to — we are only changing where the code runs, not
 * the Firestore project, structure, or auth rules.
 */
function initFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    logger.error('Missing Firebase Admin credentials in environment variables');
    throw new Error(
      'Firebase Admin credentials are not fully configured. Check FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  // Render (and most host providers) store multi-line env vars with literal
  // "\n" sequences. Firebase Admin requires actual newlines.
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  logger.info('Firebase Admin initialized', { projectId });
  return admin.app();
}

const app = initFirebase();
const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, app, db, auth };
