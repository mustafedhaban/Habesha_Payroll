# Market Position — Habesha Payroll

**Related documents:** [02-problem-statement.md](./02-problem-statement.md) · [06-vision.md](./06-vision.md) · [08-product-roadmap.md](./08-product-roadmap.md)

Content in the **positioning and pricing tables** comes from `habesha-payroll-mvp-plan.md`. **Needs Confirmation:** market validation, competitive pricing, and GTM execution are not evidenced in source code.

---

## Positioning statement

**Habesha Payroll** calculates Ethiopian PAYE and pension correctly, in Birr, and is maintained when ERCA changes the rules — so finance teams stop relying on error-prone Excel templates.

---

## Competitive alternatives

| Alternative | Weakness for Ethiopian SMEs | Habesha Payroll response |
|-------------|----------------------------|--------------------------|
| Excel templates | Break silently on rule changes | Versioned rate engine + verification banner |
| Foreign payroll SaaS | No Ethiopian PAYE/pension | Local rule encoding |
| Local ERP consultant install | Project cost, slow updates | Subscription SaaS model (**planned**, not built) |
| Manual bookkeeper | Does not scale; knowledge loss | Repeatable system + audit log |

---

## Differentiation (implemented vs. planned)

| Differentiator | Status |
|----------------|--------|
| Ethiopian PAYE bracket engine (Proclamation 1395) | ✅ Implemented & tested |
| Transport allowance exemption logic | ✅ Implemented & tested |
| Pension cap and foreign-national exemption | ✅ Implemented & tested |
| Rate schedule verification trust signal | ✅ Implemented |
| Fast rule updates via `taxEngine.js` | ✅ Architecture supports |
| Birr in-app billing (Chapa/SantimPay) | ❌ Planned (Phase B3) |
| Email alerts on payroll completion | ❌ In-app only today |
| Accountant channel GTM | ❌ Business plan only |

---

## Pricing model (planned — not in code)

From business plan. **Needs Confirmation** for go-live pricing.

| Tier | Employees | ETB/month (planned) |
|------|-----------|---------------------|
| Starter | up to 15 | 1,200 |
| Growth | 16–50 | 2,800 |
| Business | 51–150 | 6,000 |
| Enterprise | 150+ | Custom |

No `subscriptions` table or billing UI exists in the repository.

---

## Go-to-market channels (planned)

| Channel | Priority (plan) | In product today |
|---------|-----------------|------------------|
| Accountant / bookkeeper referrals | 1 | Export-friendly CSV/PDF |
| Founder network | 2 | — |
| Tax-reform content marketing | 3 | — |
| Paid digital ads | Deprioritized | — |

---

## Geographic and regulatory scope

| Dimension | Scope |
|-----------|-------|
| Country | Ethiopia |
| Tax rules encoded | PAYE (1395/2026), pension (1268/2022), transport allowance directive |
| Calendar | Gregorian month/year for payroll periods |
| Language | English UI; Amharic employee names on payslips (PDF with Noto font when available) |
