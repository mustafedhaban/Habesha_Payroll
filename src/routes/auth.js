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
  const userResult = db
    .prepare(
      'INSERT INTO users (company_id, email, password_hash, password_salt, full_name) VALUES (?, ?, ?, ?, ?)'
    )
    .run(companyId, email, hash, salt, fullName || null);
  const userId = Number(userResult.lastInsertRowid);

  const { token } = auth.createSession(userId, companyId);
  auth.setSessionCookie(res, token);

  sendJSON(res, 201, {
    user: { id: userId, email, fullName },
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
    user: { id: user.id, email: user.email, fullName: user.full_name },
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
    user: { id: user.id, email: user.email, fullName: user.full_name },
    company: { id: company.id, name: company.name, tin: company.tin },
  });
}

module.exports = { register, login, logout, me };
