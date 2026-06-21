# Habesha Payroll — MVP

A cloud payroll & tax compliance tool for Ethiopian employers: add employees,
run monthly payroll, and get PAYE income tax and pension contributions
calculated automatically under **Income Tax Proclamation No. 1395/2026** and
the **Private Organization Employees' Pension Proclamation No. 1268/2022**.

This is a working MVP, not a finished product — see **Limitations & next
steps** before showing it to real customers.

## Why zero dependencies

This was built in a sandboxed environment with no access to the npm
registry, so it intentionally uses **only Node.js built-ins**:

- `node:http` for the server (no Express)
- `node:sqlite` for persistence (Node's built-in SQLite, stable enough for
  an MVP, still labeled experimental upstream)
- `node:crypto` for password hashing (scrypt) and session tokens
- Hand-written router, cookie parsing, and CSV writer

This means `npm install` installs nothing and the app runs immediately —
genuinely useful for demoing on a flight with no wifi. For production,
see the **Before you take this to production** section below.

## Quick start

```bash
npm install      # no-op — there's nothing to install
npm start        # starts the server on http://localhost:3000
```

Then open `http://localhost:3000` in a browser, click **Register company**,
and create an account.

Run the tax engine test suite at any time:

```bash
npm test
```

All 7 tests check the calculation engine against worked examples published
under the 2026 tax reform (e.g. an ETB 15,000/month salary should produce
exactly ETB 3,200 PAYE, ETB 1,050 employee pension, and ETB 10,750 net pay).

## What's in the MVP

- **Multi-tenant accounts** — each company registers and only sees its own
  data (session-based auth, scrypt-hashed passwords).
- **Employee records** — name (with optional Amharic name field), position,
  gross salary, pension-exemption flag for foreign nationals, status.
- **Payroll runs** — pick a month/year, and it calculates PAYE + pension for
  every active employee in one click. Duplicate runs for the same period
  are blocked; mistaken runs can be deleted and redone.
- **Payslips** — a clean, printable HTML payslip per employee per run
  (use the browser's "Print → Save as PDF" — see note below on why this
  isn't a server-generated PDF yet).
- **CSV export** — a per-run export formatted for handing to your
  accountant or filing with ERCA / the pension fund.
- **Dashboard** — headline stats: active employees, current monthly payroll
  cost, last run filed.

## Architecture

```
src/
  server.js        — HTTP server + routing (no framework)
  db.js             — SQLite schema (companies, users, sessions, employees,
                       payroll_runs, payroll_items)
  auth.js           — password hashing, session cookies
  taxEngine.js      — PAYE + pension calculation (see below)
  http-utils.js     — JSON body parsing / response helpers
  routes/
    auth.js, employees.js, payroll.js
test/
  taxEngine.test.js — verifies the engine against published figures
public/
  index.html, dashboard.html, employees.html,
  payroll-run.html, payroll-history.html
  css/styles.css    — design tokens (teal + ochre palette)
  js/               — vanilla JS, one file per page + shared api.js
```

## The tax engine — the actual IP of this product

`src/taxEngine.js` is deliberately the most carefully isolated file in the
codebase, because **tracking Ethiopian tax law accurately and updating fast
is the entire competitive advantage** of a local payroll product over a
generic spreadsheet or a foreign tool that will never bother to track ERCA
directives.

Current rules encoded (per Proclamation No. 1395/2026):

| Monthly income (ETB) | Rate | Deduction |
|---|---|---|
| 0 – 2,000 | 0% | 0 |
| 2,000 – 4,000 | 15% | 300 |
| 4,000 – 7,000 | 20% | 500 |
| 7,000 – 10,000 | 25% | 850 |
| 10,000 – 14,000 | 30% | 1,350 |
| 14,000+ | 35% | 2,050 |

Pension: 7% employee / 11% employer, computed on gross salary capped at an
ETB 15,000 base. Foreign nationals with no Ethiopian origin can be flagged
exempt.

**When the rules next change** (and they will — this is the second major
reform in under two years), update the constants in `taxEngine.js`, add a
new test case with the published worked example for the new rates, and
ship it. That turnaround time, not the UI, is what customers are paying for.

## Limitations & next steps

Being upfront about what's *not* done, in rough priority order for getting
this to a real pilot customer:

1. **Payslips are HTML, not true PDFs.** Browser print-to-PDF works fine for
   now, but a real product should generate PDFs server-side. That needs a
   PDF library (e.g. `pdfkit`) — trivial once you have normal npm access.
2. **`node:sqlite` is labeled experimental by Node.js.** Fine for an MVP
   and even an early pilot with a handful of companies; for real scale,
   plan to migrate to `better-sqlite3` or Postgres.
3. **No payment collection yet.** The natural next step is wiring up
   **Chapa** or **SantimPay** so companies can pay their subscription in
   Birr from inside the app — both have simple REST APIs.
4. **Gregorian calendar only.** Periods are stored as Gregorian month/year,
   which matches how ERCA's monthly withholding filings actually work, but
   you may want an Ethiopian-calendar display toggle for some customers.
5. **No allowances, overtime, bonuses, or leave deductions yet** — only flat
   gross salary. Real Ethiopian payroll also needs non-taxable transport
   allowance handling, which is a common next-feature request.
6. **No audit log or multi-user-per-company roles** — right now one login
   per company. Add roles (admin/viewer) before selling to anyone with
   more than one finance staffer.
7. **No automated bracket-change alerts.** Consider a small admin-only page
   that flags "rate schedule unchanged for N months" as a reminder to
   verify nothing's changed at ERCA.

## Before you take this to production

- Move off `node:sqlite` to a battle-tested DB.
- Put this behind HTTPS (e.g. behind Caddy/Nginx or a platform like
  Render/Railway/Fly.io that handles TLS for you).
- Set a real `PORT` and run under a process manager (`pm2`, systemd, or the
  hosting platform's built-in one) instead of `node src/server.js` directly.
- Add rate limiting on `/api/auth/login` to slow down credential stuffing.
- Rotate session secrets / add session revocation on password change.
- Get a second set of eyes (ideally an Ethiopian accountant or ERCA-familiar
  auditor) to sign off on the tax engine before anyone runs real payroll
  through it — this is a compliance product; a bug here has real
  consequences for a real business.
