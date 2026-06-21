'use strict';

const db = require('./db');

/**
 * Record an audit-log entry. Failures here must never break the underlying
 * action, so the insert is best-effort and swallows errors.
 * @param {object} session - authenticated session ({ company_id, user_id })
 * @param {string} action - short verb phrase, e.g. 'employee.created'
 * @param {string} [detail] - human-readable detail line
 */
function record(session, action, detail = null) {
  try {
    db.prepare(
      'INSERT INTO audit_log (company_id, user_id, action, detail) VALUES (?, ?, ?, ?)'
    ).run(session.company_id, session.user_id, action, detail);
  } catch (err) {
    console.error('audit log failed:', err.message);
  }
}

module.exports = { record };
