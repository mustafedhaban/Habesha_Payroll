# Feature List — Habesha Payroll

**Related documents:** [09-feature-list.md](./09-feature-list.md) · [10-prd.md](./10-prd.md) · [12-business-rules.md](./12-business-rules.md)

Legend: ✅ Implemented · 🟡 Partial · ❌ Not implemented · 📋 Planned (docs only)

---

## Authentication & accounts

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-A01 | Company registration | ✅ | Creates company + admin user |
| F-A02 | Email/password login | ✅ | scrypt hashing |
| F-A03 | Session cookies (7-day TTL) | ✅ | HttpOnly, SameSite=Lax |
| F-A04 | Logout | ✅ | Destroys session |
| F-A05 | Current user endpoint | ✅ | `GET /api/auth/me` |
| F-A06 | Forgot password | 🟡 | Token created; link shown on screen, not emailed |
| F-A07 | Reset password | ✅ | Invalidates existing sessions |
| F-A08 | Teammate invite + accept | 🟡 | Invite link shown on screen, not emailed |

---

## Company & user profile

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-C01 | Company name + TIN | ✅ | Admin can edit |
| F-C02 | User display name | ✅ | Settings → Your profile |
| F-C03 | Change password | ✅ | Requires current password |
| F-C04 | Email change | ❌ | Email read-only in UI |

---

## Employees

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-E01 | Employee list | ✅ | All authenticated users |
| F-E02 | Create / update / delete | ✅ | Admin only |
| F-E03 | Basic salary + transport allowance | ✅ | |
| F-E04 | Amharic name field | ✅ | Optional; transliteration helper in UI |
| F-E05 | Pension exempt flag | ✅ | Foreign nationals |
| F-E06 | Employment status | ✅ | UI: active/terminated; payroll uses `active` only |
| F-E07 | CSV bulk import | ✅ | Preview + commit |
| F-E08 | Start date | ✅ | Stored; not used in proration |

---

## Payroll & tax

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-P01 | PAYE calculation (6 brackets) | ✅ | `taxEngine.js` |
| F-P02 | Pension 7% / 11%, cap ETB 15,000 | ✅ | On basic salary only |
| F-P03 | Transport allowance exemption | ✅ | min(2200, 25% basic) |
| F-P04 | Payroll preview | ✅ | No DB write |
| F-P05 | Payroll run | ✅ | Stores run + line items |
| F-P06 | One run per period | ✅ | 409 on duplicate |
| F-P07 | Delete run | ✅ | Admin only |
| F-P08 | Rate version stamp | ✅ | `2026-Proclamation-1395` |
| F-P09 | Overtime / bonuses / leave | ❌ | Phase C |
| F-P10 | Historical recalc on rule change | ❌ | Stored figures are authoritative |

---

## Outputs & reporting

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-O01 | HTML payslip preview | ✅ | Browser print fallback |
| F-O02 | PDF payslip | ✅ | PDFKit; Amharic font if file present |
| F-O03 | ZIP all payslips | ✅ | JSZip |
| F-O04 | CSV export per run | ✅ | ERCA/pension-oriented columns |
| F-O05 | Dedicated reports module | ❌ | CSV only |
| F-O06 | Bank payment files | ❌ | Phase C |

---

## Collaboration & compliance

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-T01 | Admin / viewer roles | ✅ | |
| F-T02 | Team list + pending invites | ✅ | |
| F-T03 | Audit log | ✅ | Last 200 entries |
| F-T04 | Activity page | ✅ | |
| F-T05 | Rate schedule verification | ✅ | Global log table |
| F-T06 | Dashboard rate banner | ✅ | |
| F-T07 | In-app notifications | ✅ | Payroll, rate verify, invites |
| F-T08 | Email notifications | ❌ | Phase B4 |

---

## UI & platform

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-U01 | React admin suite | ✅ | Vite + React 19 |
| F-U02 | Dark mode | ✅ | localStorage |
| F-U03 | Dashboard KPIs | ✅ | |
| F-U04 | Workspace search | ❌ | UI placeholder only |
| F-U05 | Mobile native app | ❌ | Responsive web only |

---

## Commercial & operations

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-B01 | Subscription billing | ❌ | Chapa/SantimPay planned |
| F-B02 | Tier gating by employee count | ❌ | |
| F-B03 | Production deployment config | ❌ | |
| F-B04 | Login rate limiting | ❌ | Recommended in README |
| F-B05 | Demo seed script | ✅ | `scripts/seed.js` |

---

## Test coverage map

| Area | Automated tests |
|------|-----------------|
| Tax engine | ✅ `test/taxEngine.test.js` |
| Transport allowance | ✅ Included in tax tests |
| CSV parser | ✅ `test/csv.test.js` |
| Payroll calc helpers | ✅ `test/payrollCalc.test.js` |
| PDF / ZIP generation | ✅ `test/payslipPdf.test.js`, `test/payslipZip.test.js` |
| Notifications helper | ✅ `test/notifications.test.js` |
| HTTP API / E2E | ❌ None |

Total: **26 tests** via `npm test`.
