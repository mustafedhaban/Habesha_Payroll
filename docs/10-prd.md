# Product Requirements Document (PRD) — Habesha Payroll

**Document ID:** PRD-HP-001  
**Version:** 0.1.0  
**Status:** Draft — reflects implemented MVP + documented gaps  
**Related documents:** [09-feature-list.md](./09-feature-list.md) · [11-user-stories.md](./11-user-stories.md) · [12-business-rules.md](./12-business-rules.md) · [13-acceptance-criteria.md](./13-acceptance-criteria.md)

---

## 1. Purpose

Define product requirements for **Habesha Payroll MVP**: a web application for Ethiopian employers to manage employees and run monthly payroll with correct PAYE and pension calculations.

---

## 2. Background

See [02-problem-statement.md](./02-problem-statement.md). Income Tax Proclamation No. 1395/2026 changed PAYE brackets; employers need tooling that tracks current rules.

---

## 3. Goals

| Goal | Metric (proposed) |
|------|-------------------|
| Accurate withholding | Zero failed tax engine tests; **Needs Confirmation:** zero pilot-reported errors |
| Complete monthly workflow | Register → employees → run → export in one session |
| Multi-user finance teams | Admin + viewer with API-enforced permissions |
| Compliance evidence | Audit log + rate verification + stored rate version |

---

## 4. Non-goals (this release)

- Subscription billing and payment collection  
- Email delivery infrastructure  
- Overtime, bonuses, leave, housing allowances  
- Bank-specific export formats  
- Ethiopian calendar period selection  
- Platform super-admin console  

---

## 5. User roles

| Role | Description |
|------|-------------|
| **Admin** | Full operational control for one company |
| **Viewer** | Read-only access to roster, payroll history, exports, activity |
| **Guest** | Unauthenticated; registration and token-based flows only |

See [18-permission-matrix.md](./18-permission-matrix.md).

---

## 6. Functional requirements

### 6.1 Authentication (FR-AUTH)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTH-01 | User can register a new company with email and password (≥8 chars) | P0 | ✅ |
| FR-AUTH-02 | User can sign in and receive session cookie | P0 | ✅ |
| FR-AUTH-03 | User can sign out | P0 | ✅ |
| FR-AUTH-04 | User can request password reset | P1 | 🟡 Dev link only |
| FR-AUTH-05 | Admin can invite teammate by email with role | P1 | 🟡 Dev link only |
| FR-AUTH-06 | Invitee can accept invite and set password | P1 | ✅ |

### 6.2 Employee management (FR-EMP)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-EMP-01 | Admin can CRUD employees scoped to company | P0 | ✅ |
| FR-EMP-02 | Employee has basic salary and transport allowance | P0 | ✅ |
| FR-EMP-03 | Employee can be marked pension-exempt | P0 | ✅ |
| FR-EMP-04 | Only active employees included in payroll | P0 | ✅ |
| FR-EMP-05 | Admin can bulk import via CSV with preview | P0 | ✅ |
| FR-EMP-06 | Viewer can list employees but not modify | P1 | ✅ |

### 6.3 Payroll (FR-PAY)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-PAY-01 | Admin can preview payroll for month/year without saving | P0 | ✅ |
| FR-PAY-02 | Admin can run payroll for all active employees | P0 | ✅ |
| FR-PAY-03 | System blocks duplicate run for same period | P0 | ✅ |
| FR-PAY-04 | Calculations use current tax engine rules | P0 | ✅ |
| FR-PAY-05 | Admin can delete erroneous run | P1 | ✅ |
| FR-PAY-06 | Users can view run history and line-item detail | P0 | ✅ |
| FR-PAY-07 | System stores rate_version on each run | P1 | ✅ |

### 6.4 Outputs (FR-OUT)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-OUT-01 | Download CSV export per run | P0 | ✅ |
| FR-OUT-02 | View HTML payslip per employee | P1 | ✅ |
| FR-OUT-03 | Download PDF payslip | P1 | ✅ |
| FR-OUT-04 | Download ZIP of all PDF payslips | P2 | ✅ |

### 6.5 Compliance & collaboration (FR-CMP)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-CMP-01 | Record audit entries for key actions | P1 | ✅ |
| FR-CMP-02 | Display rate schedule last verified date | P1 | ✅ |
| FR-CMP-03 | Admin can record new verification | P2 | ✅ |
| FR-CMP-04 | Notify company users of key events (in-app) | P2 | ✅ |
| FR-CMP-05 | Email notifications | P2 | ❌ |

### 6.6 Company settings (FR-SET)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-SET-01 | Admin can set company name and TIN | P1 | ✅ |
| FR-SET-02 | User can update display name | P2 | ✅ |
| FR-SET-03 | User can change password | P1 | ✅ |

---

## 7. Non-functional requirements

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-01 | Node.js ≥ 22.5 | ✅ Enforced in package.json |
| NFR-02 | Tenant data isolation | ✅ company_id scoping |
| NFR-03 | Passwords hashed with scrypt | ✅ |
| NFR-04 | Tax constants isolated in one module | ✅ |
| NFR-05 | HTTPS in production | ❌ Not configured |
| NFR-06 | Login rate limiting | ❌ |
| NFR-07 | 99.9% uptime SLA | ❌ Not applicable at MVP |

---

## 8. Dependencies

| Dependency | Purpose |
|------------|---------|
| better-sqlite3 | Database |
| pdfkit | PDF payslips |
| jszip | Payslip archives |
| React / Vite | Frontend |

---

## 9. Open questions (Needs Confirmation)

| # | Question |
|---|----------|
| 1 | Has an independent accountant validated the tax engine for production use? |
| 2 | Which payment provider (Chapa vs SantimPay) for Phase B billing? |
| 3 | Should `employment_status` normalize to `active` / `terminated` only? |
| 4 | Should rate schedule verification be per-company instead of global? |
| 5 | Target hosting platform (Render, Railway, Fly.io, VPS)? |

---

## 10. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | Needs Confirmation | — | Pending |
| Engineering | Needs Confirmation | — | Pending |
| Compliance | Needs Confirmation | — | Pending |
