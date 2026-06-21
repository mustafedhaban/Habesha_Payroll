'use strict';

const db = require('../db');
const auth = require('../auth');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const companyName = (body.companyName || '').trim();
  const fullName = (body.fullName || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!companyName || !email || !password) {
    return sendError(res, 400, 'Company name, email, and password are required.');
  }
  if (!EMAIL_RE.test(email)) {
    return sendError(res, 400, 'Enter a valid email address.');
  }
  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return sendError(res, 409, 'An account with this email already exists.');
  }

  const companyResult = db
    .prepare('INSERT INTO companies (name, tin) VALUES (?, ?)')
    .run(companyName, body.tin || null);
  const companyId = Number(companyResult.lastInsertRowid);

  const { hash, salt } = auth.hashPassword(password);
  // The user who registers the company is its first admin.
  const userResult = db
    .prepare(
      "INSERT INTO users (company_id, email, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, 'admin')"
    )
    .run(companyId, email, hash, salt, fullName || null);
  const userId = Number(userResult.lastInsertRowid);

  const { token } = auth.createSession(userId, companyId);
  auth.setSessionCookie(res, token);

  sendJSON(res, 201, {
    user: { id: userId, email, fullName, role: 'admin' },
    company: { id: companyId, name: companyName },
  });
}

async function login(req, res) {
  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required.');
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !auth.verifyPassword(password, user.password_salt, user.password_hash)) {
    return sendError(res, 401, 'Incorrect email or password.');
  }

  const company = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(user.company_id);

  const { token } = auth.createSession(user.id, user.company_id);
  auth.setSessionCookie(res, token);

  sendJSON(res, 200, {
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    company: { id: company.id, name: company.name },
  });
}

function logout(req, res) {
  const cookies = auth.parseCookies(req);
  if (cookies.session) {
    auth.destroySession(cookies.session);
  }
  auth.clearSessionCookie(res);
  sendJSON(res, 200, { ok: true });
}

function me(req, res) {
  const session = auth.authenticate(req);
  if (!session) return sendError(res, 401, 'Not signed in.');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  const company = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(session.company_id);

  sendJSON(res, 200, {
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    company: { id: company.id, name: company.name, tin: company.tin },
  });
}

// --- A3: password reset -----------------------------------------------------

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * POST /api/auth/forgot-password { email }
 * Always responds 200 (don't reveal whether an account exists). When the
 * email matches a user, a reset token is created. Since this build has no
 * outbound email, the reset link is returned directly for on-screen display.
 */
async function forgotPassword(req, res) {
  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return sendError(res, 400, 'Enter a valid email address.');

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const response = {
    message:
      'If an account exists for that email, a password reset link has been generated.',
  };

  if (user) {
    const token = auth.randomToken();
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
    db.prepare(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, token, expiresAt);
    // Dev convenience: surface the link. In production this is emailed instead.
    response.devResetLink = `/reset-password?token=${token}`;
    response.devNote =
      'In production this link would be emailed to you — for now, here it is directly.';
  }

  sendJSON(res, 200, response);
}

/**
 * POST /api/auth/reset-password { token, password }
 */
async function resetPassword(req, res) {
  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const token = (body.token || '').trim();
  const password = body.password || '';
  if (!token) return sendError(res, 400, 'Reset token is required.');
  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters.');
  }

  const row = db
    .prepare('SELECT * FROM password_reset_tokens WHERE token = ?')
    .get(token);
  if (!row || row.used) {
    return sendError(res, 400, 'This reset link is invalid or has already been used.');
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return sendError(res, 400, 'This reset link has expired. Request a new one.');
  }

  const { hash, salt } = auth.hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(
    hash, salt, row.user_id
  );
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);
  // Invalidate existing sessions so the old password's sessions can't linger.
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);

  sendJSON(res, 200, { ok: true, message: 'Password updated. You can now sign in.' });
}

// --- A5: accept a teammate invite ------------------------------------------

/**
 * GET /api/auth/invite?token=... — returns the invite's email/company so the
 * accept page can pre-fill and confirm before the user sets a password.
 */
function getInvite(req, res, token) {
  const invite = db
    .prepare(
      `SELECT i.email, i.role, i.expires_at, i.used, c.name AS company_name
       FROM invites i JOIN companies c ON c.id = i.company_id
       WHERE i.token = ?`
    )
    .get(token);
  if (!invite || invite.used) {
    return sendError(res, 404, 'This invite is invalid or has already been used.');
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return sendError(res, 410, 'This invite has expired. Ask an admin to resend it.');
  }
  sendJSON(res, 200, {
    email: invite.email,
    role: invite.role,
    companyName: invite.company_name,
  });
}

/**
 * POST /api/auth/accept-invite { token, fullName, password }
 * Creates a user in the inviting company with the invite's role, signs them in.
 */
async function acceptInvite(req, res) {
  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const token = (body.token || '').trim();
  const fullName = (body.fullName || '').trim();
  const password = body.password || '';
  if (!token) return sendError(res, 400, 'Invite token is required.');
  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters.');
  }

  const invite = db.prepare('SELECT * FROM invites WHERE token = ?').get(token);
  if (!invite || invite.used) {
    return sendError(res, 400, 'This invite is invalid or has already been used.');
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return sendError(res, 410, 'This invite has expired. Ask an admin to resend it.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
  if (existing) {
    return sendError(res, 409, 'An account with this email already exists. Just sign in.');
  }

  const { hash, salt } = auth.hashPassword(password);
  const userResult = db
    .prepare(
      'INSERT INTO users (company_id, email, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(invite.company_id, invite.email, hash, salt, fullName || null, invite.role);
  const userId = Number(userResult.lastInsertRowid);
  db.prepare('UPDATE invites SET used = 1 WHERE id = ?').run(invite.id);

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(invite.company_id);
  const { token: sessionToken } = auth.createSession(userId, invite.company_id);
  auth.setSessionCookie(res, sessionToken);

  sendJSON(res, 201, {
    user: { id: userId, email: invite.email, fullName, role: invite.role },
    company: { id: company.id, name: company.name },
  });
}

module.exports = {
  register, login, logout, me,
  forgotPassword, resetPassword, getInvite, acceptInvite,
};
