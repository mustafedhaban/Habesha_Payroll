'use strict';

const db = require('./db');

const insertStmt = db.prepare(
  `INSERT INTO notifications (company_id, user_id, kind, title, body, link_path)
   VALUES (?, ?, ?, ?, ?, ?)`
);

/**
 * Create an in-app notification for one user. Failures are swallowed so
 * notification delivery never blocks the underlying action.
 */
function notifyUser(userId, companyId, { kind, title, body = null, linkPath = null }) {
  try {
    insertStmt.run(companyId, userId, kind, title, body, linkPath);
  } catch (err) {
    console.error('notification failed:', err.message);
  }
}

/**
 * Notify every user in a company. Pass excludeUserId to skip the actor
 * (e.g. the admin who just ran payroll does not need their own alert).
 */
function notifyCompany(companyId, payload, excludeUserId = null) {
  try {
    const users = db
      .prepare('SELECT id FROM users WHERE company_id = ?')
      .all(companyId);
    for (const user of users) {
      if (excludeUserId != null && user.id === excludeUserId) continue;
      notifyUser(user.id, companyId, payload);
    }
  } catch (err) {
    console.error('company notification failed:', err.message);
  }
}

module.exports = { notifyUser, notifyCompany };
