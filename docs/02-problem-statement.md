# Problem Statement — Habesha Payroll

**Related documents:** [01-product-brief.md](./01-product-brief.md) · [03-target-users.md](./03-target-users.md) · [05-market-position.md](./05-market-position.md)

---

## The problem

Ethiopian private employers must calculate and remit **monthly PAYE income tax** and **employee/employer pension contributions** for staff. Rules are defined in national proclamations and ERCA/MoR directives. When brackets or exemptions change — as with **Income Tax Proclamation No. 1395/2026** — existing spreadsheets and informal processes produce **incorrect payslips and filings**.

### Pain points observed in the domain (from product planning; not user-research validated in code)

| Pain | Impact |
|------|--------|
| Excel-based payroll templates | Silent errors when tax brackets change; no version control on formulas |
| Manual transport allowance handling | Common payslip line; easy to misapply exemption caps |
| No audit trail | Compliance buyers cannot answer “who ran payroll and when?” |
| Foreign payroll tools | Do not model Ethiopian PAYE/pension; no Birr-native workflow |
| Consultant-installed ERP | High upfront cost; slow to update when rules change |

---

## Who feels the pain

Primary users are **finance managers and bookkeepers** at Ethiopian SMEs (roughly 10–150 employees) who run payroll monthly but lack dedicated payroll software. See [03-target-users.md](./03-target-users.md) and [04-user-personas.md](./04-user-personas.md).

---

## Why now

Proclamation No. 1395/2026 reshaped PAYE brackets and the tax-free threshold. Employers still using pre-reform templates risk **under- or over-withholding** — a forcing function to adopt tools that track current rules.

The codebase encodes the 2026 schedule as rate version `2026-Proclamation-1395` in `src/taxEngine.js`.

---

## What success looks like

| Outcome | How the product addresses it |
|---------|-------------------------------|
| Correct monthly tax and pension | Isolated, tested `taxEngine.js` |
| Repeatable monthly process | Payroll preview → run → history → exports |
| Trust and compliance evidence | Audit log, rate verification banner, stored `rate_version` on runs |
| Faster onboarding | CSV employee import, demo seed script |

---

## Out of scope (current MVP)

These problems are **not** solved by the current implementation:

- Overtime, bonuses, leave deductions, housing allowances
- Bank bulk-payment file generation
- Automated ERCA rule ingestion
- Multi-country payroll
- Subscription billing and in-app payment collection

See [28-future-enhancements.md](./28-future-enhancements.md).

---

## Assumptions

| Assumption | Status |
|------------|--------|
| Employers file using **Gregorian month/year** periods | Implemented; matches planning doc rationale |
| Transport allowance exemption rules in build plan are correct | Encoded in code; **Needs Confirmation:** independent accountant sign-off |
| Pilot customers will accept in-app notifications instead of email | Partially true today (in-app only) |
