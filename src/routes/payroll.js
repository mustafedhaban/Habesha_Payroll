'use strict';

const db = require('../db');
const audit = require('../audit');
const notifications = require('../notifications');
const taxEngine = require('../taxEngine');
const {
  MONTH_NAMES,
  validatePeriod,
  periodLabel,
  calculateItemsForEmployees,
  sumPayrollTotals,
} = require('../payrollCalc');
const { requireSession, requireAdmin } = require('./guards');
const { generatePayslipPdf, payslipFilename } = require('../payslipPdf');
const { buildPayslipZip, payslipZipFilename } = require('../payslipZip');
const { sendJSON, sendError } = require('../http-utils');

function loadActiveEmployees(companyId) {
  return db
    .prepare("SELECT * FROM employees WHERE company_id = ? AND employment_status = 'active'")
    .all(companyId);
}

function existingRunForPeriod(companyId, month, year) {
  return db
    .prepare(
      'SELECT id FROM payroll_runs WHERE company_id = ? AND period_month = ? AND period_year = ?',
    )
    .get(companyId, month, year);
}

/** POST /api/payroll/preview — calculate without saving. */
async function previewPayroll(req, res, body) {
  const session = requireAdmin(req, res);
  if (!session) return;

  const period = validatePeriod(body.month, body.year);
  if (period.error) return sendError(res, 400, period.error);

  const employees = loadActiveEmployees(session.company_id);
  if (employees.length === 0) {
    return sendError(res, 400, 'Add at least one active employee before previewing payroll.');
  }

  const items = calculateItemsForEmployees(employees);
  const totals = sumPayrollTotals(items);
  const existing = existingRunForPeriod(session.company_id, period.month, period.year);

  sendJSON(res, 200, {
    preview: true,
    month: period.month,
    year: period.year,
    items,
    totals,
    alreadyRun: Boolean(existing),
  });
}

/** Run payroll for a given month/year across all active employees. */
async function runPayroll(req, res, body) {
  const session = requireAdmin(req, res);
  if (!session) return;

  const period = validatePeriod(body.month, body.year);
  if (period.error) return sendError(res, 400, period.error);
  const { month, year } = period;

  if (existingRunForPeriod(session.company_id, month, year)) {
    return sendError(
      res,
      409,
      `Payroll for ${MONTH_NAMES[month - 1]} ${year} has already been run. Delete it first if you need to redo it.`,
    );
  }

  const employees = loadActiveEmployees(session.company_id);
  if (employees.length === 0) {
    return sendError(res, 400, 'Add at least one active employee before running payroll.');
  }

  const runResult = db
    .prepare(
      'INSERT INTO payroll_runs (company_id, period_month, period_year, rate_version) VALUES (?, ?, ?, ?)',
    )
    .run(session.company_id, month, year, taxEngine.RATE_VERSION);
  const runId = Number(runResult.lastInsertRowid);

  const insertItem = db.prepare(
    `INSERT INTO payroll_items
      (payroll_run_id, employee_id, employee_name, position, basic_salary, transport_allowance,
       exempt_transport, taxable_transport, gross_salary, income_tax, employee_pension, employer_pension, net_pay)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const items = calculateItemsForEmployees(employees);
  for (const it of items) {
    insertItem.run(
      runId,
      it.employeeId,
      it.employeeName,
      it.position,
      it.basicSalary,
      it.transportAllowance,
      it.exemptTransport,
      it.taxableTransport,
      it.grossPay,
      it.incomeTax,
      it.employeePension,
      it.employerPension,
      it.netPay,
    );
  }

  const totals = sumPayrollTotals(items);

  audit.record(
    session,
    'payroll.run',
    `Ran payroll for ${MONTH_NAMES[month - 1]} ${year} (${items.length} employee(s))`,
  );
  notifications.notifyCompany(
    session.company_id,
    {
      kind: 'payroll.completed',
      title: `Payroll completed — ${MONTH_NAMES[month - 1]} ${year}`,
      body: `${items.length} employee(s) processed. Total net pay ETB ${totals.netPay.toLocaleString()}.`,
      linkPath: '/payroll-history',
    },
    session.user_id,
  );
  sendJSON(res, 201, { runId, month, year, items, totals });
}

function listRuns(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const runs = db
    .prepare(
      `SELECT r.id, r.period_month, r.period_year, r.rate_version, r.created_at,
              COUNT(i.id) AS employee_count,
              COALESCE(SUM(i.gross_salary), 0) AS total_gross,
              COALESCE(SUM(i.income_tax), 0) AS total_tax,
              COALESCE(SUM(i.employee_pension), 0) AS total_employee_pension,
              COALESCE(SUM(i.employer_pension), 0) AS total_employer_pension,
              COALESCE(SUM(i.net_pay), 0) AS total_net
       FROM payroll_runs r
       LEFT JOIN payroll_items i ON i.payroll_run_id = r.id
       WHERE r.company_id = ?
       GROUP BY r.id
       ORDER BY r.period_year DESC, r.period_month DESC`
    )
    .all(session.company_id);

  sendJSON(res, 200, { runs });
}

function getRunOr404(session, runId, res) {
  const run = db
    .prepare('SELECT * FROM payroll_runs WHERE id = ? AND company_id = ?')
    .get(runId, session.company_id);
  if (!run) {
    sendError(res, 404, 'Payroll run not found.');
    return null;
  }
  return run;
}

function getRun(req, res, runId) {
  const session = requireSession(req, res);
  if (!session) return;

  const run = getRunOr404(session, runId, res);
  if (!run) return;

  const items = db
    .prepare('SELECT * FROM payroll_items WHERE payroll_run_id = ? ORDER BY employee_name')
    .all(runId);

  sendJSON(res, 200, { run, items });
}

function deleteRun(req, res, runId) {
  const session = requireAdmin(req, res);
  if (!session) return;

  const run = getRunOr404(session, runId, res);
  if (!run) return;

  db.prepare('DELETE FROM payroll_items WHERE payroll_run_id = ?').run(runId);
  db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(runId);
  audit.record(
    session,
    'payroll.deleted',
    `Deleted payroll run for ${MONTH_NAMES[run.period_month - 1]} ${run.period_year}`
  );
  notifications.notifyCompany(
    session.company_id,
    {
      kind: 'payroll.deleted',
      title: `Payroll run removed — ${MONTH_NAMES[run.period_month - 1]} ${run.period_year}`,
      body: 'A payroll period was deleted and can be re-run if needed.',
      linkPath: '/payroll-history',
    },
    session.user_id,
  );
  sendJSON(res, 200, { ok: true });
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** CSV export formatted for ERCA / pension fund remittance filing. */
function exportRunCSV(req, res, runId) {
  const session = requireSession(req, res);
  if (!session) return;

  const run = getRunOr404(session, runId, res);
  if (!run) return;

  const items = db
    .prepare('SELECT * FROM payroll_items WHERE payroll_run_id = ? ORDER BY employee_name')
    .all(runId);

  const header = [
    'Employee Name', 'Position', 'Basic Salary (ETB)', 'Transport Allowance (ETB)',
    'Taxable Transport (ETB)', 'Gross Pay (ETB)', 'Income Tax / PAYE (ETB)',
    'Employee Pension 7% (ETB)', 'Employer Pension 11% (ETB)', 'Net Pay (ETB)',
  ];
  const rows = items.map((it) => [
    it.employee_name, it.position || '', it.basic_salary.toFixed(2),
    it.transport_allowance.toFixed(2), it.taxable_transport.toFixed(2),
    it.gross_salary.toFixed(2), it.income_tax.toFixed(2), it.employee_pension.toFixed(2),
    it.employer_pension.toFixed(2), it.net_pay.toFixed(2),
  ]);
  const sum = (key) => items.reduce((s, i) => s + i[key], 0).toFixed(2);
  const totalsRow = [
    'TOTAL', '', sum('basic_salary'), sum('transport_allowance'),
    sum('taxable_transport'), sum('gross_salary'), sum('income_tax'),
    sum('employee_pension'), sum('employer_pension'), sum('net_pay'),
  ];

  const lines = [header, ...rows, totalsRow].map((r) => r.map(csvEscape).join(','));
  const csv = lines.join('\r\n');

  const filename = `payroll-${run.period_year}-${String(run.period_month).padStart(2, '0')}.csv`;
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.end(csv);
}

function loadRunPayslipItems(runId) {
  return db
    .prepare(
      `SELECT pi.*, e.full_name_am AS employee_name_am
       FROM payroll_items pi
       JOIN employees e ON e.id = pi.employee_id
       WHERE pi.payroll_run_id = ?
       ORDER BY pi.employee_name`,
    )
    .all(runId);
}

function loadPayslipContext(session, runId, employeeId, res) {
  const run = getRunOr404(session, runId, res);
  if (!run) return null;

  const item = db
    .prepare(
      `SELECT pi.*, e.full_name_am AS employee_name_am
       FROM payroll_items pi
       JOIN employees e ON e.id = pi.employee_id
       WHERE pi.payroll_run_id = ? AND pi.employee_id = ?`,
    )
    .get(runId, employeeId);
  if (!item) {
    sendError(res, 404, 'Payslip not found.');
    return null;
  }

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(session.company_id);
  const label = periodLabel(run.period_month, run.period_year);

  return { company, run, item, periodLabel: label };
}

/** HTML preview payslip — kept for on-screen review and browser print fallback. */
function payslipPreview(req, res, runId, employeeId) {
  const session = requireSession(req, res);
  if (!session) return;

  const ctx = loadPayslipContext(session, runId, employeeId, res);
  if (!ctx) return;

  const { company, run, item, periodLabel } = ctx;
  const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pdfUrl = `/api/payroll/runs/${runId}/payslip/${employeeId}.pdf`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payslip — ${item.employee_name} — ${periodLabel}</title>
<style>
  :root {
    --color-bg: #F5F6F8;
    --color-surface: #FFFFFF;
    --color-ink: #131820;
    --color-muted: #717886;
    --color-border: #E8EAEF;
    --color-primary: #0E5A54;
    --color-primary-hover: #0B4843;
    --color-accent: #C2772E;
    --color-alert: #C4453A;
    --font-display: 'Space Grotesk', 'Segoe UI', sans-serif;
    --font-body: 'Inter', 'Segoe UI', sans-serif;
    --font-mono: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--color-bg); color: var(--color-ink); font-family: var(--font-body); padding: 40px 16px; }
  h1 { font-family: var(--font-display); }
  .btn {
    display: inline-block; background: var(--color-primary); color: #fff; border: 1px solid var(--color-primary);
    border-radius: 4px; padding: 9px 16px; font-family: var(--font-body); font-size: 14px; font-weight: 600;
    cursor: pointer;
  }
  .btn:hover { background: var(--color-primary-hover); }
  .btn-outline {
    display: inline-block; background: var(--color-surface); color: var(--color-ink);
    border: 1px solid var(--color-border); border-radius: 4px; padding: 9px 16px;
    font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer;
    text-decoration: none; margin-left: 8px;
  }
  .btn-outline:hover { background: var(--color-bg); }
  .payslip { max-width: 640px; margin: 0 auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px; padding: 40px; position: relative; }
  .payslip-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--color-ink); padding-bottom: 16px; margin-bottom: 24px; }
  .payslip-header h1 { font-size: 20px; margin: 0 0 4px; }
  .payslip-header .period { font-family: var(--font-mono); color: var(--color-muted); font-size: 13px; }
  .payslip-header .tin { font-family: var(--font-mono); color: var(--color-muted); font-size: 12px; margin-top: 4px; }
  .meta-am { font-size: 14px; color: var(--color-muted); margin-top: 4px; }
  .stamp { position: absolute; top: 36px; right: 40px; width: 96px; height: 96px; border: 2.5px solid var(--color-accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-12deg); opacity: 0.85; text-align: center; }
  .stamp span { font-family: var(--font-mono); font-size: 9px; line-height: 1.3; color: var(--color-accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
  table.payslip-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.payslip-table td { padding: 9px 0; font-size: 14px; border-bottom: 1px solid var(--color-border); }
  table.payslip-table td.amount { text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  table.payslip-table tr.deduction td.amount { color: var(--color-alert); }
  table.payslip-table tr.net td { font-weight: 700; font-size: 16px; border-bottom: none; border-top: 2px solid var(--color-ink); padding-top: 14px; }
  .meta { font-size: 13px; color: var(--color-muted); margin-bottom: 24px; }
  .footnote { margin-top: 28px; font-size: 11px; color: var(--color-muted); font-family: var(--font-mono); }
  .print-bar { max-width: 640px; margin: 0 auto 16px; text-align: right; }
  @media print { .print-bar { display: none; } body { padding: 0; } .payslip { border: none; } }
</style>
</head>
<body>
  <div class="print-bar">
    <a href="${pdfUrl}" class="btn">Download PDF</a>
    <button onclick="window.print()" class="btn-outline">Print preview</button>
  </div>
  <div class="payslip">
    <div class="stamp"><span>Proclamation<br/>1395/2026<br/>Compliant</span></div>
    <div class="payslip-header">
      <div>
        <h1>${company.name}</h1>
        ${company.tin ? `<div class="tin">TIN ${company.tin}</div>` : ''}
        <div class="period">Payslip — ${periodLabel}</div>
      </div>
    </div>
    <div class="meta">
      <strong>${item.employee_name}</strong>${item.position ? ` · ${item.position}` : ''}
      ${item.employee_name_am ? `<div class="meta-am">${item.employee_name_am}</div>` : ''}
    </div>
    <table class="payslip-table">
      <tr><td>Basic Salary</td><td class="amount">ETB ${fmt(item.basic_salary)}</td></tr>
      ${
        item.transport_allowance > 0
          ? `<tr><td>Transport Allowance</td><td class="amount">ETB ${fmt(item.transport_allowance)}</td></tr>
      <tr><td style="padding-left:18px; color:var(--color-muted); font-size:13px;">· Non-taxable portion</td><td class="amount" style="font-size:13px;">ETB ${fmt(item.exempt_transport)}</td></tr>
      <tr><td style="padding-left:18px; color:var(--color-muted); font-size:13px;">· Taxable portion</td><td class="amount" style="font-size:13px;">ETB ${fmt(item.taxable_transport)}</td></tr>`
          : ''
      }
      <tr><td><strong>Gross Pay</strong></td><td class="amount"><strong>ETB ${fmt(item.gross_salary)}</strong></td></tr>
      <tr class="deduction"><td>Income Tax (PAYE)</td><td class="amount">− ETB ${fmt(item.income_tax)}</td></tr>
      <tr class="deduction"><td>Employee Pension (7%)</td><td class="amount">− ETB ${fmt(item.employee_pension)}</td></tr>
      <tr class="net"><td>Net Pay</td><td class="amount">ETB ${fmt(item.net_pay)}</td></tr>
    </table>
    <div class="footnote">
      Employer pension contribution (11%, not deducted from pay): ETB ${fmt(item.employer_pension)}<br/>
      Calculated under PAYE rate schedule ${run.rate_version}. Generated by Habesha Payroll — not a substitute for ERCA filing confirmation.
    </div>
  </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

/** Server-generated PDF payslip download. */
async function payslipPdf(req, res, runId, employeeId) {
  const session = requireSession(req, res);
  if (!session) return;

  const ctx = loadPayslipContext(session, runId, employeeId, res);
  if (!ctx) return;

  try {
    const pdf = await generatePayslipPdf(ctx);
    const filename = payslipFilename(ctx.run, ctx.item);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  } catch (err) {
    console.error('Payslip PDF generation failed:', err);
    sendError(res, 500, 'Could not generate payslip PDF.');
  }
}

/** Download all payslips for a run as a ZIP of PDFs. */
async function exportPayslipZip(req, res, runId) {
  const session = requireSession(req, res);
  if (!session) return;

  const run = getRunOr404(session, runId, res);
  if (!run) return;

  const items = loadRunPayslipItems(runId);
  if (items.length === 0) {
    return sendError(res, 404, 'No payslips found for this run.');
  }

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(session.company_id);
  const label = periodLabel(run.period_month, run.period_year);

  try {
    const zip = await buildPayslipZip({ company, run, items, periodLabel: label });
    const filename = payslipZipFilename(run);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zip.length,
    });
    res.end(zip);
  } catch (err) {
    console.error('Payslip ZIP generation failed:', err);
    sendError(res, 500, 'Could not generate payslip ZIP.');
  }
}

module.exports = {
  runPayroll,
  previewPayroll,
  listRuns,
  getRun,
  deleteRun,
  exportRunCSV,
  exportPayslipZip,
  payslipPreview,
  payslipPdf,
  MONTH_NAMES,
};
