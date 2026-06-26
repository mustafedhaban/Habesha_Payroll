# Acceptance Criteria — Habesha Payroll

**Related documents:** [10-prd.md](./10-prd.md) · [11-user-stories.md](./11-user-stories.md) · [23-testing-strategy.md](./23-testing-strategy.md)

Each criterion maps to **testable behavior**. Automated test coverage noted where applicable.

---

## Authentication

### AC-AUTH-01 — Company registration
| Step | Expected result |
|------|-----------------|
| Submit valid company name, email, password (≥8) | HTTP 201; session cookie set; user role = `admin` |
| Register duplicate email | HTTP 409 |
| Invalid email format | HTTP 400 |

**Automated test:** ❌ None (API integration gap)

### AC-AUTH-02 — Login
| Step | Expected result |
|------|-----------------|
| Valid credentials | HTTP 200; session cookie |
| Invalid credentials | HTTP 401; generic error message |

### AC-AUTH-03 — Password reset
| Step | Expected result |
|------|-----------------|
| Request reset for existing email | HTTP 200; `devResetLink` in response (dev mode) |
| Reset with valid token + new password | HTTP 200; old sessions invalidated |
| Reuse token | HTTP 400 |

---

## Tax engine (automated ✅)

### AC-TAX-01 — Zero / sub-threshold tax
- Income ≤ ETB 2,000 → PAYE = 0  
- **Test:** `taxEngine.test.js`

### AC-TAX-02 — Bracket boundaries
- Cumulative tax at 4k, 7k, 10k, 14k matches published figures  
- **Test:** `taxEngine.test.js`

### AC-TAX-03 — ETB 15,000 example
- PAYE = 3,200; employee pension = 1,050; net = 10,750 (no allowance)  
- **Test:** `taxEngine.test.js`

### AC-TAX-04 — Transport allowance caps
| Scenario | Expected |
|----------|----------|
| Allowance under both caps | Fully exempt |
| Allowance above ETB 2,200 | ETB 2,200 cap binds |
| Low basic, high allowance | 25% of basic cap binds |
| Zero allowance | Same as pre-A1 engine |

- **Test:** `taxEngine.test.js`

### AC-TAX-05 — Pension cap and exemption
- Salary above ETB 15,000 → pension on 15,000 base only  
- `isPensionExempt` → zero pension  
- **Test:** `taxEngine.test.js`

---

## Employees

### AC-EMP-01 — Create employee (admin)
| Field | Validation |
|-------|------------|
| fullName | Required, non-empty |
| basicSalary | Positive number |
| transportAllowance | ≥ 0 |

Viewer attempt → HTTP 403

### AC-EMP-02 — CSV import
| Step | Expected result |
|------|-----------------|
| Upload CSV with preview flag | Returns row-level valid/invalid without DB write |
| Commit valid rows | Transactional insert; audit `employee.imported` |
| Missing required columns | HTTP 400 |

---

## Payroll

### AC-PAY-01 — Preview
| Step | Expected result |
|------|-----------------|
| POST preview with valid period | Returns items + totals; no DB rows created |
| No active employees | HTTP 400 |
| Viewer | HTTP 403 |

### AC-PAY-02 — Run payroll
| Step | Expected result |
|------|-----------------|
| First run for period | HTTP 201; run + items persisted; audit + notifications |
| Duplicate period | HTTP 409 |
| Inactive/terminated employees excluded | Not in line items |

### AC-PAY-03 — Delete run
| Step | Expected result |
|------|-----------------|
| Admin deletes run | Items and run removed; audit + notification |
| Viewer deletes | HTTP 403 |

---

## Exports

### AC-OUT-01 — CSV download
- Authenticated user for own company → `text/csv` attachment  
- Wrong company run → HTTP 404  

### AC-OUT-02 — PDF payslip
- Returns valid PDF buffer (starts with `%PDF`)  
- **Test:** `payslipPdf.test.js`

### AC-OUT-03 — ZIP archive
- Contains PDF entries for each line item  
- **Test:** `payslipZip.test.js`

---

## Roles & permissions

### AC-ROLE-01 — Viewer read access
- Can GET employees, payroll runs, activity, notifications, rate schedule  

### AC-ROLE-02 — Viewer write blocked
- POST/PUT/DELETE on admin routes → HTTP 403  

See full matrix: [18-permission-matrix.md](./18-permission-matrix.md)

---

## Compliance features

### AC-CMP-01 — Audit log
- Employee create/update/delete, import, payroll run/delete, invite, rate verify → audit row  

### AC-CMP-02 — Rate banner
- Dashboard shows last `verified_date` when `rate_schedule_checks` has rows  

### AC-CMP-03 — Notifications
- Payroll run notifies other company users (not actor)  
- **Test:** `notifications.test.js`

---

## Definition of Done (engineering)

Before merging tax engine changes:

1. Update `test/taxEngine.test.js` **first**  
2. Run `npm test` — all pass  
3. Human review for bracket/allowance changes  
4. One feature per commit (project rule)

Before production launch (**Needs Confirmation** checklist):

- [ ] Independent accountant sign-off documented  
- [ ] Outbound email for reset/invites  
- [ ] HTTPS deployment  
- [ ] Login rate limiting  
- [ ] README accurate  
