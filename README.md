# Habesha Payroll — MVP

A cloud payroll & tax compliance tool for Ethiopian employers: add employees,
run monthly payroll, and get PAYE income tax and pension contributions
calculated automatically under **Income Tax Proclamation No. 1395/2026** and
the **Private Organization Employees' Pension Proclamation No. 1268/2022**.

This is a working MVP, not a finished product. See [docs/27-known-limitations.md](docs/27-known-limitations.md) before showing it to real customers.

**Full documentation:** [docs/README.md](docs/README.md)

---

## Quick start

### Prerequisites

- Node.js ≥ 22.5.0
- npm

### Install & run (development)

Use two terminals:

```bash
# Terminal 1 — API server (http://localhost:3000)
npm install
npm start

# Terminal 2 — React dev server (http://localhost:5173, proxies /api)
npm run dev:web
```

Open **http://localhost:5173**, register a company, and sign in.

### Production build

```bash
npm install
npm run build:web   # builds web/dist
npm start           # serves API + SPA on PORT (default 3000)
```

### Demo data

```bash
node scripts/seed.js          # add demo company if missing
node scripts/seed.js --reset  # rebuild demo company
```

Demo login (after seed): `demo@habesha.test` / `demo1234`

### Tests

```bash
npm test
```

26 automated tests cover the tax engine, payroll helpers, CSV parsing, PDF/ZIP generation, and notifications. The ETB 15,000/month worked example (ETB 3,200 PAYE, ETB 1,050 employee pension, ETB 10,750 net) is included.

---

## What's in the MVP

| Area | Features |
|------|----------|
| **Accounts** | Multi-tenant register/login, scrypt passwords, session cookies, forgot/reset password (dev link on screen) |
| **Team** | Admin / viewer roles, teammate invites (dev link on screen) |
| **Employees** | CRUD, Amharic names, basic salary + transport allowance, pension-exempt flag, CSV bulk import |
| **Payroll** | Preview then run, one run per period, delete and re-run, active employees only |
| **Tax engine** | PAYE 6 brackets, pension 7%/11% on basic (cap ETB 15,000), transport allowance exemption |
| **Outputs** | HTML payslip preview, PDF payslip, ZIP of all PDFs, CSV export per run |
| **Compliance** | Audit log, rate-schedule verification banner, in-app notifications |
| **Settings** | Company name/TIN, user profile, password change |

**Not yet built:** subscription billing (Chapa/SantimPay), outbound email, production deployment config, overtime/bonuses/leave.

See [docs/09-feature-list.md](docs/09-feature-list.md) for the full implemented vs planned list.

---

## Architecture

```
src/                    # Node backend (CommonJS, no Express)
  server.js             # HTTP router + static SPA
  db.js                 # SQLite schema (better-sqlite3)
  taxEngine.js          # PAYE + pension + transport allowance
  routes/               # auth, employees, payroll, team, …
web/                    # React 19 + TypeScript + Vite
  src/pages/            # Dashboard, employees, payroll, settings, …
  src/lib/api.ts        # API client (pages use this only)
test/                   # Unit tests (node:test)
docs/                   # Product & technical documentation
data/payroll.db         # Runtime database (created on first start)
```

Details: [docs/14-system-architecture.md](docs/14-system-architecture.md)

---

## The tax engine — the actual IP of this product

`src/taxEngine.js` is deliberately the most carefully isolated file in the
codebase, because **tracking Ethiopian tax law accurately and updating fast
is the entire competitive advantage** of a local payroll product.

**Rate version:** `2026-Proclamation-1395`

| Monthly taxable income (ETB) | Rate | Deduction |
|---|---|---|
| 0 – 2,000 | 0% | 0 |
| 2,000 – 4,000 | 15% | 300 |
| 4,000 – 7,000 | 20% | 500 |
| 7,000 – 10,000 | 25% | 850 |
| 10,000 – 14,000 | 30% | 1,350 |
| 14,000+ | 35% | 2,050 |

**Pension:** 7% employee / 11% employer on **basic salary**, capped at ETB 15,000/month. Foreign nationals can be flagged pension-exempt.

**Transport allowance:** non-taxable up to the lower of ETB 2,200/month and 25% of basic salary; excess is taxable. Pension base is unaffected.

**When rules change:** update `src/taxEngine.js`, add tests in `test/taxEngine.test.js` first, bump `RATE_VERSION`, run `npm test`. See [docs/23-testing-strategy.md](docs/23-testing-strategy.md).

---

## Documentation

| Audience | Start here |
|----------|------------|
| Everyone | [docs/README.md](docs/README.md) |
| Product / business | [docs/01-product-brief.md](docs/01-product-brief.md) |
| Engineers | [docs/14-system-architecture.md](docs/14-system-architecture.md) · [docs/17-api-specification.md](docs/17-api-specification.md) |
| Admins (users) | [docs/26-admin-manual.md](docs/26-admin-manual.md) |
| Deployment | [docs/24-deployment-guide.md](docs/24-deployment-guide.md) |

Planning docs (may lag the code in places): `habesha-payroll-build-plan.md`, `habesha-payroll-mvp-plan.md`

---

## Limitations & next steps

High-priority gaps before a paying pilot:

1. **Outbound email** — password reset and invite links are shown on screen, not emailed ([Phase B4](docs/08-product-roadmap.md))
2. **Production deployment** — HTTPS, process manager, backups ([docs/24-deployment-guide.md](docs/24-deployment-guide.md))
3. **Billing** — Chapa or SantimPay integration not implemented
4. **Independent accuracy review** — get an Ethiopian accountant to sign off on the tax engine (**Needs Confirmation**)
5. **Gregorian calendar only** — no Ethiopian calendar display toggle
6. **Payroll scope** — no overtime, bonuses, leave deductions, or bank-file exports yet

Full list: [docs/27-known-limitations.md](docs/27-known-limitations.md)  
Roadmap: [docs/08-product-roadmap.md](docs/08-product-roadmap.md)

---

## Before you take this to production

- Deploy behind **HTTPS** (Render, Railway, Fly.io, or reverse proxy)
- Run under a **process manager** (`pm2`, systemd, or platform supervisor)
- Configure **automated backups** for `data/payroll.db`
- Add **login rate limiting** on `/api/auth/login`
- Wire up **transactional email** for reset/invite flows
- Get **accountant sign-off** on tax calculations before real payroll runs

See [docs/24-deployment-guide.md](docs/24-deployment-guide.md) for a deployment checklist.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `better-sqlite3` | SQLite database |
| `pdfkit` | PDF payslips |
| `jszip` | Bulk payslip ZIP archives |

Frontend (`web/`): React 19, Vite 6, React Router 7, TypeScript.

The HTTP server uses **Node built-ins only** (`node:http`, `node:crypto`) — no Express.
