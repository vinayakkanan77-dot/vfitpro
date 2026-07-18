'use strict';

const { auth } = require('../config/firebase');
const { sendError } = require('../utils/response');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Verifies the Firebase ID token sent by the Android app in the
 * Authorization: Bearer <token> header. On success, attaches the decoded
 * token to req.firebaseUser (uid, email, etc.) and continues.
 *
 * This performs the same check admin.auth().verifyIdToken() did inside
 * Firebase Functions — nothing about the auth flow itself changes, it
 * just now runs on our own server instead of inside a Cloud Function.
 */
async function verifyFirebaseToken(req, res, next) {
  const log = req.log;
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    log?.warn('Missing or malformed Authorization header');
    return sendError(res, {
      statusCode: 401,
      message: 'Missing or malformed Authorization header. Expected: Bearer <idToken>',
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return sendError(res, {
      statusCode: 401,
      message: 'ID token is empty',
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.firebaseUser = decoded;
    log?.info('Authentication succeeded', { uid: decoded.uid });

    // Defense in depth: if the request body also carries a uid, make sure
    // it matches the authenticated user so no one can act on someone
    // else's account by forging the body.
    if (req.body && req.body.uid && req.body.uid !== decoded.uid) {
      log?.warn('uid in body does not match authenticated uid', {
        bodyUid: req.body.uid,
        tokenUid: decoded.uid,
      });
      return sendError(res, {
        statusCode: 403,
        message: 'uid does not match authenticated user',
        code: ERROR_CODES.FORBIDDEN,
      });
    }

    return next();
  } catch (error) {
    log?.warn('Token verification failed', { message: error.message });
    return sendError(res, {
      statusCode: 401,
      message: 'Invalid or expired ID token',
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }
}

module.exports = { verifyFirebaseToken };
