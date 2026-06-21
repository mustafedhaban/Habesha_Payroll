# Habesha Payroll — Technical Build Plan

Companion to `habesha-payroll-mvp-plan.md` (the business/GTM plan). This
document is engineering-focused: exactly what to build, in what order, with
enough specification that building it later doesn't require re-deriving the
rules from scratch.

---

## Build sequencing principle

Build in this order: **(1) anything that would give a wrong number on a
payslip, (2) anything that blocks a real company from onboarding without
hand-holding, (3) anything that blocks getting paid, (4) everything else.**
A compliance product earns trust slowly and loses it instantly — accuracy
and onboarding friction outrank polish every time.

---

## Phase A — Build now (next working session)

These can all be built inside the current zero-dependency, no-npm-access
environment. No blockers.

### A1. Transport allowance handling (calculation engine)
**Why first:** almost every real Ethiopian payslip has a transport line,
and the current engine only handles flat basic salary. This is a
correctness gap, which puts it above everything else.

**Confirmed rule** (Ministry of Revenue / ex-ERCA directive, still in force
— not altered by the 2026 income tax bracket reform):
- Transport allowance is **non-taxable up to the lower of**:
  - **ETB 2,200/month**, and
  - **25% of the employee's basic salary**
- Must be specified as a transport allowance in the employment contract
  (not applicable if the employer provides a company vehicle for commuting)
- Any amount paid above that exempt threshold is taxable income

**Data model change:**
- Split the existing `gross_salary` concept into `basic_salary` and a new
  `transport_allowance` column (default 0 — existing employees behave
  identically since their allowance is implicitly zero).

**Calculation change in `taxEngine.js`:**
```
exemptTransportAllowance = min(transportAllowance, 2200, basicSalary * 0.25)
taxableTransportAllowance = transportAllowance - exemptTransportAllowance
taxableIncome = basicSalary + taxableTransportAllowance
incomeTax = calculateIncomeTax(taxableIncome)   // same bracket table as today
totalGrossPay = basicSalary + transportAllowance
```

**Pension base stays unchanged:** pension is computed on **basic salary
only** (capped at ETB 15,000), not on the allowance — this matches standard
POESSA practice of excluding allowances from the pension base.

**Test cases to add:**
- Allowance under both caps → fully exempt, taxable income = basic salary only
- Allowance above ETB 2,200 but basic salary high enough that 25% cap isn't
  binding → exempt amount caps at 2,200, excess taxed
- Allowance where 25% of basic salary is the binding constraint (low-salary
  employee with a generous allowance) → exempt amount caps at 25% of basic
- Zero allowance → identical output to current engine (regression check)

**UI change:** add a "Transport allowance (ETB/month)" field to the
employee form; show the taxable/exempt split on the payslip line items
instead of a single lumped number.

---

### A2. CSV bulk employee import
**Why:** nobody will hand-type 40 employees during a sales demo or
onboarding call, and that friction kills pilot conversions before they start.

**Spec:**
- Accept a CSV upload with columns: `full_name, full_name_am, position, basic_salary, transport_allowance, is_pension_exempt, start_date`
- Parse with a hand-written CSV parser (no library needed — the format is
  simple enough; reuse the existing CSV-escaping logic already written for
  exports, just inverted)
- Validate each row; show a preview table with per-row errors before
  committing anything to the database
- Insert all valid rows in one transaction; report skipped/invalid rows
  clearly rather than silently dropping them

---

### A3. Forgot-password flow
**Why:** a single-admin SaaS with zero password recovery generates support
tickets on day one. This is currently completely missing.

**Spec (works without a real email service, with a clear upgrade path):**
- Add a `password_reset_tokens` table (token, user_id, expires_at, used)
- "Forgot password" form takes an email, generates a random token (same
  `crypto.randomBytes` approach as session tokens), stores it with a short
  expiry (e.g. 30 minutes)
- **For now (no outbound email available):** display the reset link
  directly on screen after submission, clearly labeled "In production this
  link would be emailed to you — for now, here it is directly." This keeps
  the feature usable today without pretending it's production-ready.
- **Upgrade path once real hosting/email exists:** swap the on-screen link
  for an actual email send (e.g. via a transactional email API), no other
  logic changes needed.

---

### A4. Rate-schedule verification banner
**Why:** this is small to build and directly visible proof of the core
value proposition — "we're watching the rules so you don't have to."

**Spec:**
- Add a `rate_schedule_checks` table: `version, verified_date, notes`
- Seed it with the current entry (`2026-Proclamation-1395`, today's date)
- Show a small banner on the dashboard: "PAYE rates last verified: [date]"
- This becomes a manual checklist item going forward — whenever you check
  ERCA/MoF for updates (even if nothing changed), update this row. It's a
  trust signal as much as a technical feature.

---

### A5. Multi-user company accounts (admin / viewer roles)
**Why:** the moment a pilot company has more than one finance staffer
wanting access, the current one-login-per-company model breaks down.

**Spec:**
- Add a `role` column to `users` (`admin` | `viewer`)
- Add an "Invite teammate" action on a new Settings page: admin enters an
  email, system creates a pending invite (reuse the password-reset-token
  pattern: a token-based signup link)
- `viewer` role can see employees, payroll history, and payslips, but
  cannot run payroll, edit employees, or invite others
- Gate the relevant route handlers on role, not just on "is there a valid
  session"

---

### A6. Audit log
**Why:** compliance-minded buyers will ask "who ran this and when," and
right now there's no record beyond the payroll_runs timestamp.

**Spec:**
- Add an `audit_log` table: `id, company_id, user_id, action, detail, created_at`
- Log on: employee created/edited/deleted, payroll run created/deleted,
  teammate invited, rate schedule check updated
- Simple read-only "Activity" page listing recent entries, newest first

---

## Phase B — Build once real hosting/npm access exists

These are blocked in the current sandboxed, offline build environment, not
because they're hard, but because they need either real package access or a
live server with a real domain.

### B1. Real PDF payslip generation
Swap the current browser-print HTML payslip for server-generated PDFs
(e.g. via `pdfkit` or `puppeteer`). Keep the existing HTML version as a
fallback "preview" view; generate the PDF as the actual download/email
attachment.

### B2. Production database
Move off `node:sqlite` (Node's experimental built-in) onto either
`better-sqlite3` (minimal change, same SQL) or Postgres (better long-term
for concurrent access and backups). Migration is mostly copy-paste of the
existing schema in `db.js`.

### B3. In-app billing — Chapa or SantimPay integration
- Add a `subscriptions` table: `company_id, tier, status, current_period_end`
- Build a billing page that creates a Chapa/SantimPay checkout session for
  the selected tier, redirects the customer to pay in Birr, and confirms
  via their webhook callback
- Gate payroll-run access on subscription status once this exists — but
  **not during the pilot phase**, where access should stay free regardless

### B4. Real outbound email
Pick a transactional email provider, wire up: password reset emails,
"payroll run completed" notifications, "rate schedule updated" alerts.
Replace the on-screen password-reset-link workaround from A3.

### B5. HTTPS + real domain + process manager
Deploy behind a platform that handles TLS (Render/Railway/Fly.io) or behind
a reverse proxy (Caddy/Nginx) on a VPS; run under `pm2` or the platform's
process supervisor instead of a bare `node src/server.js`.

---

## Phase C — Build later, once there are 10+ paying customers

Don't build these speculatively — build them when a real customer asks,
not before. Listed here so they're not forgotten, not because they're
queued.

| Feature | Trigger to build it |
|---|---|
| Overtime calculation (1.5x–2.5x per Labour Proclamation) | First customer with hourly/shift workers |
| Bonus / commission line items | First customer running variable pay |
| Leave-deduction handling (unpaid leave reducing gross) | First customer requesting it |
| Housing allowance / other taxable benefit types | First customer using non-transport allowances |
| Bank-file export matching a specific bank's bulk-payment format | First customer naming their bank |
| Ethiopian calendar display toggle | Recurring customer request, not a guess |
| API for accounting-software integration | First customer asking to connect QuickBooks/an ERP |
| Mobile app | Only if mobile-web usage data shows real demand |
| Multi-country payroll | Likely never, for this specific product — would be a different product |

---

## Full feature status table

| Feature | Status |
|---|---|
| Multi-tenant accounts, login | ✅ Built |
| Employee CRUD | ✅ Built |
| PAYE + pension engine (flat salary) | ✅ Built & tested |
| Payroll run workflow | ✅ Built |
| HTML payslips | ✅ Built |
| CSV export for filing | ✅ Built |
| Dashboard | ✅ Built |
| Transport allowance handling | ⏳ Phase A — next |
| CSV bulk employee import | ⏳ Phase A — next |
| Forgot-password flow | ⏳ Phase A — next |
| Rate-schedule verification banner | ⏳ Phase A — next |
| Multi-user roles | ⏳ Phase A — next |
| Audit log | ⏳ Phase A — next |
| Real PDF payslips | 🚧 Phase B — needs real hosting |
| Production database | 🚧 Phase B — needs real hosting |
| In-app billing (Chapa/SantimPay) | 🚧 Phase B — needs real hosting |
| Outbound email | 🚧 Phase B — needs real hosting |
| HTTPS / domain / deployment | 🚧 Phase B — needs real hosting |
| Overtime, bonuses, leave deductions | ⏸ Phase C — build on customer demand |
| Other allowance types | ⏸ Phase C — build on customer demand |
| Bank-file exports | ⏸ Phase C — build on customer demand |
| Ethiopian calendar toggle | ⏸ Phase C — build on customer demand |
| Accounting software API | ⏸ Phase C — build on customer demand |
| Mobile app | ⏸ Phase C — build on customer demand |

---

## What this plan deliberately leaves out

No speculative features beyond Phase C are listed at all. The honest risk
with a plan like this is building toward an imagined "complete" product
instead of the next real obstacle in front of an actual customer. If a
feature isn't in Phase A or B, the right move is to wait for a real company
to ask for it before spending time on it.
