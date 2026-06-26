# Business Rules — Habesha Payroll

**Related documents:** [16-database-design.md](./16-database-design.md) · [21-technical-specification.md](./21-technical-specification.md)

**Source of truth:** `src/taxEngine.js`, route handlers, and `test/taxEngine.test.js`.

---

## 1. Tax and pension rules (implemented)

### 1.1 PAYE income tax

**Legal basis (documented in code):** Income Tax Proclamation No. 1395/2026  
**Rate version:** `2026-Proclamation-1395`

Monthly taxable income uses progressive brackets with formula:  
`tax = taxableIncome × rate − deduction`

| Monthly taxable income (ETB) | Rate | Deduction |
|-----------------------------|------|-----------|
| 0 – 2,000 | 0% | 0 |
| 2,001 – 4,000 | 15% | 300 |
| 4,001 – 7,000 | 20% | 500 |
| 7,001 – 10,000 | 25% | 850 |
| 10,001 – 14,000 | 30% | 1,350 |
| 14,001+ | 35% | 2,050 |

**Rules:**
- Taxable income ≤ 0 → tax = 0  
- Result rounded to 2 decimal places  
- **Never modify bracket constants without explicit legal change approval** (project agent rule)

### 1.2 Pension contributions

**Legal basis:** Private Organization Employees' Pension Proclamation No. 1268/2022

| Component | Rate | Base |
|-----------|------|------|
| Employee | 7% | Basic salary, capped at ETB 15,000 |
| Employer | 11% | Basic salary, capped at ETB 15,000 |

**Rules:**
- If `is_pension_exempt = true` → both contributions = 0  
- Transport allowance **does not** affect pension base  
- Pension uses **basic salary only**, not gross pay  

### 1.3 Transport allowance exemption

**Legal basis (documented in code):** Ministry of Revenue / ex-ERCA directive (unchanged by 2026 bracket reform)

```
exemptTransport = min(transportAllowance, 2200, basicSalary × 0.25)
taxableTransport = transportAllowance − exemptTransport
taxableIncome = basicSalary + taxableTransport
grossPay = basicSalary + transportAllowance
netPay = grossPay − incomeTax − employeePension
```

**Not modeled in software (Needs Confirmation with legal advisor):**
- Requirement that allowance be specified in employment contract  
- Exclusion when employer provides company vehicle  

### 1.4 Worked example (verified in tests)

**Basic salary ETB 15,000, no allowance:**
- PAYE: ETB 3,200  
- Employee pension: ETB 1,050 (7% of 15,000)  
- Net pay: ETB 10,750 (before other deductions)

---

## 2. Payroll process rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-P01 | Payroll period = Gregorian month (1–12) + year | `validatePeriod()` in `payrollCalc.js` |
| BR-P02 | Only employees with `employment_status = 'active'` included | SQL filter in `runPayroll` |
| BR-P03 | At most one run per company per month/year | UNIQUE constraint + 409 response |
| BR-P04 | Preview does not write to database | Separate endpoint |
| BR-P05 | Line items snapshot employee name/position at run time | Stored on `payroll_items` |
| BR-P06 | `rate_version` from engine stored on each run | INSERT on `payroll_runs` |
| BR-P07 | Delete run removes items then run (admin only) | Cascade + guards |

---

## 3. Employee data rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-E01 | `full_name` required | API validation |
| BR-E02 | `basic_salary` must be positive number | API validation |
| BR-E03 | `transport_allowance` ≥ 0, default 0 | API + schema |
| BR-E04 | CSV import requires `full_name`, `basic_salary` columns | Import validator |
| BR-E05 | Invalid CSV rows skipped; valid rows committed in transaction | `employees.js` |
| BR-E06 | Legacy field `grossSalary` accepted as alias for `basicSalary` | Backward compatibility |

**Data inconsistency:** Seed uses `inactive`; UI uses `terminated`. Only `active` affects payroll. **Needs Confirmation:** canonical status vocabulary.

---

## 4. Authentication & authorization rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-A01 | Password minimum length 8 characters | Register, reset, change password |
| BR-A02 | Email must be unique globally | Registration, invite |
| BR-A03 | Session expires after 7 days | `SESSION_TTL_MS` in `auth.js` |
| BR-A04 | First registrant for company is `admin` | `register()` |
| BR-A05 | Invited users receive role from invite (`admin` or `viewer`) | `acceptInvite()` |
| BR-A06 | Password reset invalidates all user sessions | DELETE sessions on reset |
| BR-A07 | Admin-only routes return 403 for viewers | `requireAdmin()` |

---

## 5. Team & invite rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-T01 | Invite token expires in 7 days | `INVITE_TTL_MS` |
| BR-T02 | Unused invite to same email superseded on new invite | UPDATE used flag |
| BR-T03 | Cannot invite email that already has user account | 409 response |
| BR-T04 | Viewer cannot run payroll, edit employees, or invite | Admin guards |

---

## 6. Audit & notification rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-L01 | Audit failures must not break primary action | try/catch in `audit.js` |
| BR-L02 | Logged actions include employee CRUD, import, payroll run/delete, invite, rate verify | `audit.record()` calls |
| BR-L03 | Notifications sent to all company users except actor | `notifyCompany(..., excludeUserId)` |
| BR-L04 | Notification kinds: payroll.completed, payroll.deleted, rate_schedule.verified, team.invited | `notifications.js` |

**Not audited today:** Company profile updates, user profile updates, password changes.

---

## 7. Rate schedule verification

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-R01 | Active engine version exposed via API | `taxEngine.RATE_VERSION` |
| BR-R02 | Verification log is append-only inserts | `rateSchedule.verify()` |
| BR-R03 | Verification table is **global** (not per company) | Schema design |

---

## 8. Export & payslip rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-X01 | CSV includes basic, transport, taxable transport, gross, tax, pension, net | `exportRunCSV` |
| BR-X02 | PDF includes company TIN when set | `payslipPdf.js` |
| BR-X03 | Amharic name on PDF when font file exists | `assets/fonts/NotoSansEthiopic-Regular.ttf` |
| BR-X04 | Tenant can only access runs belonging to their company | Session company_id check |

---

## 9. Planned rules (not implemented)

| Rule | Source |
|------|--------|
| Subscription required to run payroll | Build plan B3 (disabled during pilot) |
| Employee count tier limits | Business plan pricing |
| Overtime multipliers | Phase C |
| Email must be sent for password reset | Build plan B4 |
