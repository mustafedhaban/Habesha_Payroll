'use strict';

const db = require('../db');
const audit = require('../audit');
const { parseCSV } = require('../csv');
const { requireSession, requireAdmin } = require('./guards');
const { sendJSON, sendError, readJSONBody } = require('../http-utils');

function list(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const rows = db
    .prepare(
      `SELECT id, full_name, full_name_am, position, basic_salary, transport_allowance,
              is_pension_exempt, employment_status, start_date
       FROM employees WHERE company_id = ? ORDER BY full_name ASC`
    )
    .all(session.company_id);

  sendJSON(res, 200, { employees: rows });
}

async function create(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const fullName = (body.fullName || '').trim();
  // `basicSalary` is the current field; `grossSalary` is accepted as a legacy
  // alias so older clients keep working until they migrate.
  const basicSalary = Number(body.basicSalary != null ? body.basicSalary : body.grossSalary);
  const transportAllowance = body.transportAllowance != null ? Number(body.transportAllowance) : 0;

  if (!fullName) return sendError(res, 400, 'Employee name is required.');
  if (!Number.isFinite(basicSalary) || basicSalary <= 0) {
    return sendError(res, 400, 'Basic salary must be a positive number.');
  }
  if (!Number.isFinite(transportAllowance) || transportAllowance < 0) {
    return sendError(res, 400, 'Transport allowance must be zero or a positive number.');
  }

  const result = db
    .prepare(
      `INSERT INTO employees
        (company_id, full_name, full_name_am, position, basic_salary, transport_allowance, is_pension_exempt, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      session.company_id,
      fullName,
      body.fullNameAm || null,
      body.position || null,
      basicSalary,
      transportAllowance,
      body.isPensionExempt ? 1 : 0,
      body.startDate || null
    );

  audit.record(session, 'employee.created', `Added employee ${fullName}`);
  sendJSON(res, 201, { id: Number(result.lastInsertRowid) });
}

async function update(req, res, employeeId) {
  const session = requireAdmin(req, res);
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
  let basicSalary = existing.basic_salary;
  if (body.basicSalary !== undefined) basicSalary = Number(body.basicSalary);
  else if (body.grossSalary !== undefined) basicSalary = Number(body.grossSalary); // legacy alias
  const transportAllowance =
    body.transportAllowance !== undefined
      ? Number(body.transportAllowance)
      : existing.transport_allowance;

  if (!fullName) return sendError(res, 400, 'Employee name is required.');
  if (!Number.isFinite(basicSalary) || basicSalary <= 0) {
    return sendError(res, 400, 'Basic salary must be a positive number.');
  }
  if (!Number.isFinite(transportAllowance) || transportAllowance < 0) {
    return sendError(res, 400, 'Transport allowance must be zero or a positive number.');
  }

  db.prepare(
    `UPDATE employees SET
      full_name = ?, full_name_am = ?, position = ?, basic_salary = ?, transport_allowance = ?,
      is_pension_exempt = ?, employment_status = ?, start_date = ?
     WHERE id = ? AND company_id = ?`
  ).run(
    fullName,
    body.fullNameAm !== undefined ? body.fullNameAm : existing.full_name_am,
    body.position !== undefined ? body.position : existing.position,
    basicSalary,
    transportAllowance,
    body.isPensionExempt !== undefined ? (body.isPensionExempt ? 1 : 0) : existing.is_pension_exempt,
    body.employmentStatus !== undefined ? body.employmentStatus : existing.employment_status,
    body.startDate !== undefined ? body.startDate : existing.start_date,
    employeeId,
    session.company_id
  );

  audit.record(session, 'employee.updated', `Edited employee ${fullName}`);
  sendJSON(res, 200, { ok: true });
}

function remove(req, res, employeeId) {
  const session = requireAdmin(req, res);
  if (!session) return;

  const existing = db
    .prepare('SELECT full_name FROM employees WHERE id = ? AND company_id = ?')
    .get(employeeId, session.company_id);

  const result = db
    .prepare('DELETE FROM employees WHERE id = ? AND company_id = ?')
    .run(employeeId, session.company_id);

  if (result.changes === 0) return sendError(res, 404, 'Employee not found.');
  audit.record(session, 'employee.deleted', `Removed employee ${existing ? existing.full_name : employeeId}`);
  sendJSON(res, 200, { ok: true });
}

// --- A2: CSV bulk import ----------------------------------------------------

const IMPORT_COLUMNS = [
  'full_name', 'full_name_am', 'position',
  'basic_salary', 'transport_allowance', 'is_pension_exempt', 'start_date',
];

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseBoolCell(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === '' || ['0', 'false', 'no', 'n'].includes(v)) return 0;
  if (['1', 'true', 'yes', 'y'].includes(v)) return 1;
  return null; // signals invalid
}

/**
 * Validate one mapped CSV row into a normalized employee object plus errors.
 */
function validateImportRow(get) {
  const errors = [];
  const fullName = (get('full_name') || '').trim();
  if (!fullName) errors.push('Full name is required.');

  const basicRaw = (get('basic_salary') || '').trim();
  const basicSalary = Number(basicRaw);
  if (basicRaw === '' || !Number.isFinite(basicSalary) || basicSalary <= 0) {
    errors.push('Basic salary must be a positive number.');
  }

  const transportRaw = (get('transport_allowance') || '').trim();
  let transportAllowance = 0;
  if (transportRaw !== '') {
    transportAllowance = Number(transportRaw);
    if (!Number.isFinite(transportAllowance) || transportAllowance < 0) {
      errors.push('Transport allowance must be zero or a positive number.');
    }
  }

  const exempt = parseBoolCell(get('is_pension_exempt'));
  if (exempt === null) errors.push('Pension-exempt must be yes/no (or 1/0).');

  const startDate = (get('start_date') || '').trim();
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    errors.push('Start date must be in YYYY-MM-DD format.');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      fullName,
      fullNameAm: (get('full_name_am') || '').trim() || null,
      position: (get('position') || '').trim() || null,
      basicSalary,
      transportAllowance,
      isPensionExempt: exempt === 1 ? 1 : 0,
      startDate: startDate || null,
    },
  };
}

/**
 * POST /api/employees/import
 * Body: { csv: string, commit?: boolean }
 * Always parses + validates and returns a per-row preview. When commit is
 * true, valid rows are inserted in a single transaction.
 */
async function importEmployees(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    return sendError(res, 400, err.message);
  }

  const text = typeof body.csv === 'string' ? body.csv.trim() : '';
  if (!text) return sendError(res, 400, 'Paste or upload CSV content to import.');

  const grid = parseCSV(text);
  if (grid.length < 2) {
    return sendError(res, 400, 'CSV needs a header row and at least one data row.');
  }

  const headers = grid[0].map(normalizeHeader);
  const missing = ['full_name', 'basic_salary'].filter((c) => !headers.includes(c));
  if (missing.length) {
    return sendError(
      res,
      400,
      `CSV is missing required column(s): ${missing.join(', ')}. Expected headers: ${IMPORT_COLUMNS.join(', ')}.`
    );
  }

  const rows = grid.slice(1).map((cells, idx) => {
    const get = (col) => {
      const at = headers.indexOf(col);
      return at === -1 ? '' : cells[at];
    };
    const result = validateImportRow(get);
    return { line: idx + 2, ...result }; // +2: 1 for header, 1 for 1-based
  });

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  if (!body.commit) {
    return sendJSON(res, 200, {
      preview: true,
      total: rows.length,
      validCount,
      invalidCount,
      rows,
    });
  }

  if (validCount === 0) {
    return sendError(res, 400, 'No valid rows to import — fix the errors and try again.');
  }

  const insert = db.prepare(
    `INSERT INTO employees
      (company_id, full_name, full_name_am, position, basic_salary, transport_allowance, is_pension_exempt, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  // Wrap the batch in a transaction — either every valid row commits, or none do.
  const importRows = db.transaction((validRows) => {
    for (const r of validRows) {
      const d = r.data;
      insert.run(
        session.company_id, d.fullName, d.fullNameAm, d.position,
        d.basicSalary, d.transportAllowance, d.isPensionExempt, d.startDate
      );
    }
  });

  try {
    importRows(rows.filter((r) => r.valid));
  } catch (err) {
    return sendError(res, 500, `Import failed and was rolled back: ${err.message}`);
  }

  audit.record(
    session,
    'employee.imported',
    `Imported ${validCount} employee(s) via CSV (${invalidCount} skipped)`
  );

  sendJSON(res, 201, {
    imported: validCount,
    skipped: invalidCount,
    rows,
  });
}

module.exports = { list, create, update, remove, importEmployees };
