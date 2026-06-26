# Admin Manual — Habesha Payroll

**Audience:** Users with `admin` role  
**Related documents:** [25-user-manual.md](./25-user-manual.md) · [12-business-rules.md](./12-business-rules.md) · [18-permission-matrix.md](./18-permission-matrix.md)

---

## Admin responsibilities

| Area | Responsibility |
|------|----------------|
| Employee data | Keep roster accurate (salary, allowance, status) |
| Monthly payroll | Preview and run each period |
| Compliance | Verify rate schedule periodically |
| Team access | Invite colleagues with appropriate roles |
| Company profile | Maintain legal name and TIN on payslips |

---

## Employee management

### Add one employee
1. **Employees** → **Add employee**  
2. Fill required fields: name, basic salary  
3. Optional: Amharic name (use transliteration suggestion), position, transport allowance, pension exempt, start date  
4. Save  

### Terminate an employee
Set **Employment status** to **Terminated**. Terminated employees are **excluded** from future payroll runs.

### Bulk import (CSV)

**Template columns:**
```
full_name,full_name_am,position,basic_salary,transport_allowance,is_pension_exempt,start_date
```

| Step | Action |
|------|--------|
| 1 | Open import panel |
| 2 | Upload CSV |
| 3 | Review preview — fix invalid rows in spreadsheet |
| 4 | Confirm import |

**Required:** `full_name`, `basic_salary`

### Pension exemption
Enable for foreign nationals without Ethiopian pension obligation. Sets employee and employer pension to zero.

---

## Transport allowance guidance

The system applies statutory exemption automatically:

```
Exempt portion = minimum of:
  - Transport allowance paid
  - ETB 2,200 per month
  - 25% of basic salary
```

Excess allowance is taxed; pension still uses **basic salary only**.

**Needs Confirmation:** legal review for contract/company-vehicle edge cases not modeled in software.

---

## Running payroll

Navigate: **Run Payroll** (sidebar)

### Recommended procedure
1. Confirm all active employees have correct salary data.  
2. Select **month** and **year**.  
3. Click **Preview payroll** — review totals and line items.  
4. If correct, click **Run payroll**.  
5. If period already exists, delete from History first (see below).

### After running
- Check **History** for the new period  
- Download **CSV** for filing  
- Distribute **PDF** or **ZIP** payslips  
- Confirm teammates received **notifications**

### Duplicate period error
Only one run per month/year is allowed. Delete the erroneous run from History, then re-run.

### Delete a payroll run
**History** → **Delete** → confirm.

Use only when the run was made in error. Deletion is audited and notifies other users.

---

## Company settings

Navigate: **Settings**

### Company profile
| Field | Purpose |
|-------|---------|
| Company name | Payslips and exports |
| TIN | Tax ID for ERCA alignment |

Click **Save company profile**.

### Team management

**Invite teammate:**
1. Enter email and role (**Viewer** or **Admin**)  
2. Create invite  
3. Share the invite link manually (email delivery not yet automated)

**Roles:**
| Role | Use when |
|------|----------|
| Viewer | Read-only finance staff |
| Admin | Can run payroll and manage data |

### Rate schedule verification

When you confirm ERCA rules are still current (or after reviewing updates):

1. Optionally add a verification note  
2. Click **Record a verification for today**

This updates the dashboard banner and creates an audit entry.

---

## Compliance checklist (monthly)

| # | Task |
|---|------|
| 1 | Update employee roster (new hires, terminations, salary changes) |
| 2 | Preview payroll before committing |
| 3 | Run payroll for the period |
| 4 | Export CSV and archive |
| 5 | Distribute payslips |
| 6 | Review Activity log |
| 7 | **Needs Confirmation:** cross-check with accountant on first cycles |

---

## Demo environment

Seed script for testing:

```bash
node scripts/seed.js
```

| Field | Value |
|-------|-------|
| Email | demo@habesha.test |
| Password | demo1234 |
| Company | Habesha Demo Trading PLC |

---

## Admin troubleshooting

| Problem | Solution |
|---------|----------|
| Preview shows zero employees | Add active employees |
| Pension seems wrong on high earner | Cap is ETB 15,000 basic — by design |
| Transport tax higher than expected | Excess above exemption is taxable |
| Viewer cannot run payroll | Expected — promote to admin if needed |
| Reset link not emailed | Copy link from forgot-password screen (dev mode) |

---

## Security practices

| Practice | Detail |
|----------|--------|
| Use strong passwords | Minimum 8 characters enforced |
| Limit admin accounts | Prefer viewer role where possible |
| Rotate passwords | Settings → Change password |
| Do not share one login | Use invites instead |

**Needs Confirmation:** organizational security policy for production.

---

## Related technical docs

- Business rules: [12-business-rules.md](./12-business-rules.md)  
- Workflows: [19-workflows.md](./19-workflows.md)  
- API reference: [17-api-specification.md](./17-api-specification.md)
