'use strict';

const db = require('../db');
const auth = require('../auth');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

function requireSession(req, res) {
  const session = auth.authenticate(req);
  if (!session) {
    sendError(res, 401, 'Not signed in.');
    return null;
  }
  return session;
}

function list(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const rows = db
    .prepare(
      `SELECT id, full_name, full_name_am, position, gross_salary,
              is_pension_exempt, employment_status, start_date
       FROM employees WHERE company_id = ? ORDER BY full_name ASC`
    )
    .all(session.company_id);

  sendJSON(res, 200, { employees: rows });
}

async function create(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const fullName = (body.fullName || '').trim();
  const grossSalary = Number(body.grossSalary);

  if (!fullName) return sendError(res, 400, 'Employee name is required.');
  if (!Number.isFinite(grossSalary) || grossSalary <= 0) {
    return sendError(res, 400, 'Gross salary must be a positive number.');
  }

  const result = db
    .prepare(
      `INSERT INTO employees
        (company_id, full_name, full_name_am, position, gross_salary, is_pension_exempt, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      session.company_id,
      fullName,
      body.fullNameAm || null,
      body.position || null,
      grossSalary,
      body.isPensionExempt ? 1 : 0,
      body.startDate || null
    );

  sendJSON(res, 201, { id: Number(result.lastInsertRowid) });
}

async function update(req, res, employeeId) {
  const session = requireSession(req, res);
  if (!session) return;

  const existing = db
    .prepare('SELECT * FROM employees WHERE id = ? AND company_id = ?')
    .get(employeeId, session.company_id);
  if (!existing) return sendError(res, 404, 'Employee not found.');

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const fullName = body.fullName !== undefined ? body.fullName.trim() : existing.full_name;
  const grossSalary =
    body.grossSalary !== undefined ? Number(body.grossSalary) : existing.gross_salary;

  if (!fullName) return sendError(res, 400, 'Employee name is required.');
  if (!Number.isFinite(grossSalary) || grossSalary <= 0) {
    return sendError(res, 400, 'Gross salary must be a positive number.');
  }

  db.prepare(
    `UPDATE employees SET
      full_name = ?, full_name_am = ?, position = ?, gross_salary = ?,
      is_pension_exempt = ?, employment_status = ?, start_date = ?
     WHERE id = ? AND company_id = ?`
  ).run(
    fullName,
    body.fullNameAm !== undefined ? body.fullNameAm : existing.full_name_am,
    body.position !== undefined ? body.position : existing.position,
    grossSalary,
    body.isPensionExempt !== undefined ? (body.isPensionExempt ? 1 : 0) : existing.is_pension_exempt,
    body.employmentStatus !== undefined ? body.employmentStatus : existing.employment_status,
    body.startDate !== undefined ? body.startDate : existing.start_date,
    employeeId,
    session.company_id
  );

  sendJSON(res, 200, { ok: true });
}

function remove(req, res, employeeId) {
  const session = requireSession(req, res);
  if (!session) return;

  const result = db
    .prepare('DELETE FROM employees WHERE id = ? AND company_id = ?')
    .run(employeeId, session.company_id);

  if (result.changes === 0) return sendError(res, 404, 'Employee not found.');
  sendJSON(res, 200, { ok: true });
}

module.exports = { list, create, update, remove };
