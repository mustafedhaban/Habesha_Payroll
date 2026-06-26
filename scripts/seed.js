'use strict';

/**
 * Seed script — populates the database with a realistic demo company so the
 * app can be exercised end-to-end (login → employees → payroll runs → payslips).
 *
 * It reuses the real modules (auth, db, taxEngine) so password hashes and all
 * payroll figures are identical to what the running server would produce.
 *
 * Usage:
 *   node scripts/seed.js          # add/refresh the demo company
 *   node scripts/seed.js --reset  # delete the demo company first, then reseed
 *
 * The demo company is isolated by its login email, so reseeding never touches
 * any other company already in the database.
 */

const db = require('../src/db');
const auth = require('../src/auth');
const taxEngine = require('../src/taxEngine');
const notifications = require('../src/notifications');

const DEMO = {
  companyName: 'Habesha Demo Trading PLC',
  tin: '0012345678',
  email: 'demo@habesha.test',
  password: 'demo1234',
  fullName: 'Selamawit Bekele',
};

// Employees chosen to exercise every code path:
//  - one salary in each of the six PAYE brackets (0% → 35%)
//  - a high earner above the ETB 15,000 pension base cap
//  - a pension-exempt foreign national
//  - transport allowances both within and above the exemption cap
//  - one inactive employee (must be excluded from payroll runs)
const EMPLOYEES = [
  { full_name: 'Abebe Tadesse',     full_name_am: 'አበበ ታደሰ',     position: 'Office Cleaner',        basic_salary: 1800,  transport_allowance: 0,    is_pension_exempt: 0, employment_status: 'active',   start_date: '2024-02-01' },
  { full_name: 'Hanna Girma',       full_name_am: 'ሐና ግርማ',     position: 'Junior Clerk',         basic_salary: 3500,  transport_allowance: 600,  is_pension_exempt: 0, employment_status: 'active',   start_date: '2023-09-15' },
  { full_name: 'Dawit Mengistu',    full_name_am: 'ዳዊት መንግስቱ',  position: 'Sales Associate',      basic_salary: 6000,  transport_allowance: 1500, is_pension_exempt: 0, employment_status: 'active',   start_date: '2023-05-20' },
  { full_name: 'Marta Alemu',       full_name_am: 'ማርታ አለሙ',    position: 'Accountant',           basic_salary: 9000,  transport_allowance: 2200, is_pension_exempt: 0, employment_status: 'active',   start_date: '2022-11-01' },
  { full_name: 'Yonas Haile',       full_name_am: 'ዮናስ ኃይሌ',    position: 'Operations Manager',   basic_salary: 12000, transport_allowance: 3000, is_pension_exempt: 0, employment_status: 'active',   start_date: '2021-07-10' },
  { full_name: 'Tigist Worku',      full_name_am: 'ትዕግስት ወርቁ',  position: 'General Manager',      basic_salary: 25000, transport_allowance: 4000, is_pension_exempt: 0, employment_status: 'active',   start_date: '2020-01-05' },
  { full_name: 'John Mwangi',       full_name_am: null,           position: 'Expat Consultant',     basic_salary: 30000, transport_allowance: 0,    is_pension_exempt: 1, employment_status: 'active',   start_date: '2025-03-01' },
  { full_name: 'Selam Negash',      full_name_am: 'ሰላም ነጋሽ',    position: 'Former Cashier',       basic_salary: 4500,  transport_allowance: 0,    is_pension_exempt: 0, employment_status: 'inactive', start_date: '2022-04-12' },
];

// Months to generate completed payroll runs for (period_month, period_year).
const RUNS = [
  { month: 3, year: 2026 },
  { month: 4, year: 2026 },
  { month: 5, year: 2026 },
];

function reset() {
  const existing = db.prepare('SELECT id, company_id FROM users WHERE email = ?').get(DEMO.email);
  if (!existing) return false;
  // ON DELETE CASCADE on users/employees/sessions/runs cleans up children.
  db.prepare('DELETE FROM companies WHERE id = ?').run(existing.company_id);
  return true;
}

function seed() {
  const wantReset = process.argv.includes('--reset');
  if (wantReset && reset()) {
    console.log('Removed existing demo company.');
  }

  const dupe = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO.email);
  if (dupe) {
    console.log(`Demo company already exists (login: ${DEMO.email}). Re-run with --reset to rebuild.`);
    return;
  }

  const companyId = Number(
    db.prepare('INSERT INTO companies (name, tin) VALUES (?, ?)').run(DEMO.companyName, DEMO.tin).lastInsertRowid
  );

  const { hash, salt } = auth.hashPassword(DEMO.password);
  const userId = Number(
    db.prepare(
      "INSERT INTO users (company_id, email, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, 'admin')"
    ).run(companyId, DEMO.email, hash, salt, DEMO.fullName).lastInsertRowid
  );

  const insertEmp = db.prepare(
    `INSERT INTO employees
      (company_id, full_name, full_name_am, position, basic_salary, transport_allowance, is_pension_exempt, employment_status, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const employeeIds = EMPLOYEES.map((e) =>
    Number(
      insertEmp.run(
        companyId, e.full_name, e.full_name_am, e.position,
        e.basic_salary, e.transport_allowance, e.is_pension_exempt,
        e.employment_status, e.start_date
      ).lastInsertRowid
    )
  );

  const insertRun = db.prepare(
    'INSERT INTO payroll_runs (company_id, period_month, period_year, rate_version) VALUES (?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    `INSERT INTO payroll_items
      (payroll_run_id, employee_id, employee_name, position, basic_salary, transport_allowance,
       exempt_transport, taxable_transport, gross_salary, income_tax, employee_pension, employer_pension, net_pay)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const { month, year } of RUNS) {
    const runId = Number(insertRun.run(companyId, month, year, taxEngine.RATE_VERSION).lastInsertRowid);
    EMPLOYEES.forEach((e, i) => {
      if (e.employment_status !== 'active') return; // mirrors runPayroll filter
      const calc = taxEngine.calculatePayroll({
        basicSalary: e.basic_salary,
        transportAllowance: e.transport_allowance,
        isPensionExempt: Boolean(e.is_pension_exempt),
      });
      insertItem.run(
        runId, employeeIds[i], e.full_name, e.position,
        calc.basicSalary, calc.transportAllowance, calc.exemptTransport, calc.taxableTransport,
        calc.grossPay, calc.incomeTax, calc.employeePension, calc.employerPension, calc.netPay
      );
    });
  }

  const activeCount = EMPLOYEES.filter((e) => e.employment_status === 'active').length;
  notifications.notifyUser(userId, companyId, {
    kind: 'payroll.completed',
    title: 'Payroll completed — May 2026',
    body: `${activeCount} employees processed for the demo period.`,
    linkPath: '/payroll-history',
  });
  notifications.notifyUser(userId, companyId, {
    kind: 'rate_schedule.verified',
    title: 'Tax rate schedule verified',
    body: `Schedule ${taxEngine.RATE_VERSION} confirmed for demo workspace.`,
    linkPath: '/settings',
  });

  console.log('\nSeed complete.');
  console.log('--------------------------------------------------');
  console.log(`Company:   ${DEMO.companyName} (TIN ${DEMO.tin})`);
  console.log(`Login:     ${DEMO.email}`);
  console.log(`Password:  ${DEMO.password}`);
  console.log(`Employees: ${EMPLOYEES.length} (${activeCount} active, ${EMPLOYEES.length - activeCount} inactive)`);
  console.log(`Runs:      ${RUNS.map((r) => `${r.month}/${r.year}`).join(', ')}`);
  console.log('--------------------------------------------------');
}

seed();
