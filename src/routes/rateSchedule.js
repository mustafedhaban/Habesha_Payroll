'use strict';

const db = require('../db');
const audit = require('../audit');
const taxEngine = require('../taxEngine');
const { requireSession, requireAdmin } = require('./guards');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

/** GET /api/rate-schedule — latest verification + the engine's active version. */
function get(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const latest = db
    .prepare('SELECT version, verified_date, notes FROM rate_schedule_checks ORDER BY id DESC LIMIT 1')
    .get();

  sendJSON(res, 200, {
    activeVersion: taxEngine.RATE_VERSION,
    latest: latest || null,
  });
}

/**
 * POST /api/rate-schedule/verify { notes? } — admin only.
 * Records a fresh "checked the rules on this date" entry. The version comes
 * from the engine, so the banner always reflects what's actually in force.
 */
async function verify(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  const notes = (body.notes || '').trim() || null;
  db.prepare(
    'INSERT INTO rate_schedule_checks (version, verified_date, notes) VALUES (?, ?, ?)'
  ).run(taxEngine.RATE_VERSION, today, notes);

  audit.record(session, 'rate_schedule.verified', `Verified rate schedule ${taxEngine.RATE_VERSION}`);

  sendJSON(res, 201, {
    activeVersion: taxEngine.RATE_VERSION,
    latest: { version: taxEngine.RATE_VERSION, verified_date: today, notes },
  });
}

module.exports = { get, verify };
