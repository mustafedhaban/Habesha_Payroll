# Product Brief — Habesha Payroll

**Version:** 0.1.0 (MVP)  
**Last updated:** 2026-06-24  
**Status:** Working prototype — not production-ready for paying customers  
**Related documents:** [02-problem-statement.md](./02-problem-statement.md) · [07-mvp-definition.md](./07-mvp-definition.md) · [09-feature-list.md](./09-feature-list.md)

---

## Summary

**Habesha Payroll** is a cloud payroll and tax compliance web application for Ethiopian private employers. It calculates monthly **Pay-As-You-Earn (PAYE)** income tax and **pension contributions** under Ethiopian law, stores employee and payroll records per company, and produces payslips and filing exports.

The product’s competitive advantage is a **locally maintained tax calculation engine** (`src/taxEngine.js`) that encodes Proclamation No. 1395/2026 brackets and transport allowance rules, with automated tests against published worked examples.

---

## What exists today

| Area | Status |
|------|--------|
| Multi-tenant company accounts | ✅ Implemented |
| Employee management + CSV import | ✅ Implemented |
| Monthly payroll runs with preview | ✅ Implemented |
| PAYE + pension + transport allowance | ✅ Implemented |
| Payslips (HTML, PDF, ZIP) | ✅ Implemented |
| CSV export per payroll run | ✅ Implemented |
| Admin / viewer roles + invites | ✅ Implemented |
| Audit log + in-app notifications | ✅ Implemented |
| Subscription billing | ❌ Not implemented |
| Outbound email | ❌ Not implemented |
| Production deployment | ❌ Not configured in repo |

---

## Target outcome

Enable Ethiopian finance teams to run monthly payroll with **correct withholding and pension figures**, an **audit trail**, and **exportable records** for accountants and remittance filing — without maintaining fragile Excel templates that break when ERCA updates tax rules.

---

## Technology snapshot

| Layer | Stack |
|-------|-------|
| Backend | Node.js ≥ 22.5, hand-written HTTP router, CommonJS |
| Database | SQLite (`better-sqlite3`), file at `data/payroll.db` |
| Frontend | React 19, TypeScript, Vite 6, React Router 7 |
| PDF / ZIP | PDFKit, JSZip |
| Tests | Node built-in test runner (26 tests) |

---

## Key stakeholders

| Stakeholder | Interest |
|-------------|----------|
| Company admin (finance manager) | Run payroll, manage employees, exports |
| Viewer (finance staff) | Read-only access to roster and history |
| Product / engineering | Maintain tax engine accuracy and onboarding |
| Accountant / auditor | Correct figures, audit trail, exports |
| **Needs Confirmation:** Pilot customers | Not yet documented in codebase |

---

## Success criteria (MVP prototype)

Derived from implemented capabilities and planning documents:

1. Tax engine passes all automated tests against published bracket examples.
2. A company can register, add employees, run payroll for a month, and download payslips/CSV.
3. Multi-user access works with admin/viewer separation at the API layer.
4. Activity and notifications record key payroll and compliance events.

Commercial launch criteria (billing, email, deployment, external compliance review) are **not yet met** — see [27-known-limitations.md](./27-known-limitations.md).

---

## Document map

| Audience | Start here |
|----------|------------|
| Business / product | This document → [08-product-roadmap.md](./08-product-roadmap.md) → [10-prd.md](./10-prd.md) |
| Engineering | [14-system-architecture.md](./14-system-architecture.md) → [17-api-specification.md](./17-api-specification.md) |
| Operations | [24-deployment-guide.md](./24-deployment-guide.md) |
| End users | [25-user-manual.md](./25-user-manual.md) · [26-admin-manual.md](./26-admin-manual.md) |
