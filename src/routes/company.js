'use strict';

const db = require('../db');
const { requireSession, requireAdmin } = require('./guards');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

/** GET /api/company — company profile for the signed-in tenant. */
function getCompany(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const company = db.prepare('SELECT id, name, tin FROM companies WHERE id = ?').get(session.company_id);
  if (!company) return sendError(res, 404, 'Company not found.');
  sendJSON(res, 200, { company });
}

/** PUT /api/company { name?, tin? } — admin only. */
async function updateCompany(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(session.company_id);
  if (!company) return sendError(res, 404, 'Company not found.');

  const name = body.name !== undefined ? String(body.name).trim() : company.name;
  const tin = body.tin !== undefined ? String(body.tin).trim() || null : company.tin;

  if (!name) return sendError(res, 400, 'Company name is required.');

  db.prepare('UPDATE companies SET name = ?, tin = ? WHERE id = ?').run(name, tin, session.company_id);
  sendJSON(res, 200, { company: { id: company.id, name, tin } });
}

module.exports = { getCompany, updateCompany };
