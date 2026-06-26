'use strict';

const db = require('../db');
const { requireSession } = require('./guards');
const { sendJSON, sendError } = require('../http-utils');

/** GET /api/notifications — recent notifications for the signed-in user. */
function list(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const items = db
    .prepare(
      `SELECT id, kind, title, body, link_path, read_at, created_at
       FROM notifications
       WHERE user_id = ? AND company_id = ?
       ORDER BY id DESC
       LIMIT 50`
    )
    .all(session.user_id, session.company_id);

  const unread = db
    .prepare(
      `SELECT COUNT(*) AS c FROM notifications
       WHERE user_id = ? AND company_id = ? AND read_at IS NULL`
    )
    .get(session.user_id, session.company_id).c;

  sendJSON(res, 200, { items, unread });
}

/** POST /api/notifications/:id/read */
function markRead(req, res, notificationId) {
  const session = requireSession(req, res);
  if (!session) return;

  const row = db
    .prepare(
      `SELECT id FROM notifications
       WHERE id = ? AND user_id = ? AND company_id = ?`
    )
    .get(notificationId, session.user_id, session.company_id);

  if (!row) return sendError(res, 404, 'Notification not found.');

  db.prepare(
    `UPDATE notifications SET read_at = datetime('now')
     WHERE id = ? AND read_at IS NULL`
  ).run(notificationId);

  sendJSON(res, 200, { ok: true });
}

/** POST /api/notifications/read-all */
function markAllRead(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  db.prepare(
    `UPDATE notifications SET read_at = datetime('now')
     WHERE user_id = ? AND company_id = ? AND read_at IS NULL`
  ).run(session.user_id, session.company_id);

  sendJSON(res, 200, { ok: true });
}

module.exports = { list, markRead, markAllRead };
