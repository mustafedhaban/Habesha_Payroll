'use strict';

const db = require('../db');
const { requireSession } = require('./guards');
const { sendJSON } = require('../http-utils');

/** GET /api/activity — recent audit-log entries for the company, newest first. */
function list(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const entries = db
    .prepare(
      `SELECT a.id, a.action, a.detail, a.created_at,
              u.email AS user_email, u.full_name AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.company_id = ?
       ORDER BY a.id DESC
       LIMIT 200`
    )
    .all(session.company_id);

  sendJSON(res, 200, { entries });
}

module.exports = { list };
