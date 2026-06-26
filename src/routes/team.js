'use strict';

const db = require('../db');
const auth = require('../auth');
const audit = require('../audit');
const notifications = require('../notifications');
const { requireSession, requireAdmin } = require('./guards');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** GET /api/team — members and pending invites for the company. */
function list(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const members = db
    .prepare(
      `SELECT id, email, full_name, role, created_at
       FROM users WHERE company_id = ? ORDER BY created_at ASC`
    )
    .all(session.company_id);

  const pending = db
    .prepare(
      `SELECT id, email, role, created_at, expires_at
       FROM invites WHERE company_id = ? AND used = 0
       ORDER BY created_at DESC`
    )
    .all(session.company_id);

  sendJSON(res, 200, { members, pending, currentUserId: session.user_id });
}

/** POST /api/team/invite { email, role } — admin only. */
async function invite(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const email = (body.email || '').trim().toLowerCase();
  const role = body.role === 'admin' ? 'admin' : 'viewer';
  if (!EMAIL_RE.test(email)) return sendError(res, 400, 'Enter a valid email address.');

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return sendError(res, 409, 'A user with this email already exists.');
  }

  // Supersede any earlier unused invite to the same email for this company.
  db.prepare(
    'UPDATE invites SET used = 1 WHERE company_id = ? AND email = ? AND used = 0'
  ).run(session.company_id, email);

  const token = auth.randomToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO invites (company_id, email, role, token, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(session.company_id, email, role, token, session.user_id, expiresAt);

  audit.record(session, 'team.invited', `Invited ${email} as ${role}`);

  notifications.notifyCompany(
    session.company_id,
    {
      kind: 'team.invited',
      title: 'New teammate invited',
      body: `${email} was invited as ${role}.`,
      linkPath: '/settings',
    },
    session.user_id,
  );

  sendJSON(res, 201, {
    email,
    role,
    // Dev convenience: surface the signup link. In production this is emailed.
    devInviteLink: `/accept-invite?token=${token}`,
    devNote: 'In production this link would be emailed to the invitee.',
  });
}

module.exports = { list, invite };
