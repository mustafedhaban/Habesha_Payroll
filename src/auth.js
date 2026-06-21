'use strict';

const crypto = require('node:crypto');
const db = require('./db');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  // Constant-time comparison
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSession(userId, companyId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO sessions (token, user_id, company_id, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, userId, companyId, expiresAt);
  return { token, expiresAt };
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function getSession(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.token, s.user_id, s.company_id, s.expires_at, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return row;
}

function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  );
}

/**
 * Middleware-style helper: returns the authenticated session for a
 * request, or null. Use at the top of any protected route handler.
 */
function authenticate(req) {
  const cookies = parseCookies(req);
  return getSession(cookies.session);
}

module.exports = {
  hashPassword,
  verifyPassword,
  randomToken,
  createSession,
  getSession,
  destroySession,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  authenticate,
};
