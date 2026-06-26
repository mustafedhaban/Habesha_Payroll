'use strict';

const db = require('../db');
const auth = require('../auth');
const { requireSession } = require('./guards');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

/** PUT /api/user/profile { fullName } */
async function updateProfile(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const fullName = (body.fullName ?? '').trim();
  if (!fullName) {
    return sendError(res, 400, 'Display name is required.');
  }

  db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName, session.user_id);

  sendJSON(res, 200, {
    user: {
      id: session.user_id,
      email: db.prepare('SELECT email FROM users WHERE id = ?').get(session.user_id).email,
      fullName,
      role: session.role,
    },
  });
}

/** POST /api/user/change-password { currentPassword, newPassword } */
async function changePassword(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'Current and new password are required.');
  }
  if (newPassword.length < 8) {
    return sendError(res, 400, 'New password must be at least 8 characters.');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  if (!auth.verifyPassword(currentPassword, user.password_salt, user.password_hash)) {
    return sendError(res, 401, 'Current password is incorrect.');
  }

  const { hash, salt } = auth.hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(
    hash,
    salt,
    session.user_id,
  );

  sendJSON(res, 200, { ok: true, message: 'Password updated.' });
}

module.exports = { updateProfile, changePassword };
