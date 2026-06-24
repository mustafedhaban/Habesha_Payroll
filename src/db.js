'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'payroll.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tin TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    full_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    full_name_am TEXT,
    position TEXT,
    basic_salary REAL NOT NULL,
    transport_allowance REAL NOT NULL DEFAULT 0,
    is_pension_exempt INTEGER NOT NULL DEFAULT 0,
    employment_status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payroll_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    rate_version TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, period_month, period_year)
  );

  CREATE TABLE IF NOT EXISTS payroll_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    employee_name TEXT NOT NULL,
    position TEXT,
    basic_salary REAL NOT NULL DEFAULT 0,
    transport_allowance REAL NOT NULL DEFAULT 0,
    exempt_transport REAL NOT NULL DEFAULT 0,
    taxable_transport REAL NOT NULL DEFAULT 0,
    gross_salary REAL NOT NULL,
    income_tax REAL NOT NULL,
    employee_pension REAL NOT NULL,
    employer_pension REAL NOT NULL,
    net_pay REAL NOT NULL
  );

  -- A3: password reset tokens (emailed in production; shown on-screen in dev)
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- A5: teammate invites (token-based signup into an existing company)
  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    token TEXT UNIQUE NOT NULL,
    invited_by INTEGER REFERENCES users(id),
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- A4: rate-schedule verification log (trust signal on the dashboard)
  CREATE TABLE IF NOT EXISTS rate_schedule_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    verified_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- A6: audit log (who did what, when — per company)
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// --- Migrations for databases created before A1 (transport allowance) -------
// Reconcile columns by hand; each step is idempotent.
function columnNames(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

const employeeCols = columnNames('employees');
if (employeeCols.includes('gross_salary') && !employeeCols.includes('basic_salary')) {
  // Pre-A1 employees stored a single gross_salary that was effectively the
  // basic salary (no allowance existed yet) — rename in place.
  db.exec('ALTER TABLE employees RENAME COLUMN gross_salary TO basic_salary;');
}
if (!columnNames('employees').includes('transport_allowance')) {
  db.exec('ALTER TABLE employees ADD COLUMN transport_allowance REAL NOT NULL DEFAULT 0;');
}

const itemCols = columnNames('payroll_items');
const addItemCol = (name) => {
  if (!itemCols.includes(name)) {
    db.exec(`ALTER TABLE payroll_items ADD COLUMN ${name} REAL NOT NULL DEFAULT 0;`);
  }
};
addItemCol('basic_salary');
addItemCol('transport_allowance');
addItemCol('exempt_transport');
addItemCol('taxable_transport');
// Backfill historical rows: before A1, gross_salary was basic-salary-only with
// no allowance, so basic_salary mirrors it for any rows added before migration.
if (!itemCols.includes('basic_salary')) {
  db.exec('UPDATE payroll_items SET basic_salary = gross_salary WHERE basic_salary = 0;');
}

// A5: every existing user predates roles and is the sole login for their
// company, so they become 'admin'. New invited users default to 'viewer'.
if (!columnNames('users').includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';");
}

// A4: seed the rate-schedule log with the version currently in the engine so
// the dashboard banner has something to show on first run.
const checkCount = db.prepare('SELECT COUNT(*) AS c FROM rate_schedule_checks').get().c;
if (checkCount === 0) {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    'INSERT INTO rate_schedule_checks (version, verified_date, notes) VALUES (?, ?, ?)'
  ).run(
    require('./taxEngine').RATE_VERSION,
    today,
    'Initial baseline verification against the published proclamation.'
  );
}

module.exports = db;
