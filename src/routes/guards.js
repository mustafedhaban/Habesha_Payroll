'use strict';

const auth = require('../auth');
const { sendError } = require('../http-utils');

/** Return the authenticated session, or null after sending a 401. */
function requireSession(req, res) {
  const session = auth.authenticate(req);
  if (!session) {
    sendError(res, 401, 'Not signed in.');
    return null;
  }
  return session;
}

/** Return the session only if the user is an admin, else send a 403. */
function requireAdmin(req, res) {
  const session = requireSession(req, res);
  if (!session) return null;
  if (session.role !== 'admin') {
    sendError(res, 403, 'This action requires an admin account.');
    return null;
  }
  return session;
}

module.exports = { requireSession, requireAdmin };
