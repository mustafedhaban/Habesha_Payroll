# Habesha Payroll — Full MVP Plan

**Product:** Cloud payroll & tax compliance SaaS for Ethiopian employers
**Stage:** Technical prototype built (Phase 0 complete) → validating path to first paying customers
**Document purpose:** Single source of truth for what's built, what's left, how it gets sold, and in what order

---

## 1. Vision & positioning

**One-line pitch:** Habesha Payroll calculates PAYE and pension correctly, in Birr, and gets updated the day ERCA changes the rules — so Ethiopian finance staff stop doing it by hand in Excel.

**Why now:** Proclamation No. 1395/2026 just tripled the tax-free threshold and reshuffled every bracket. Every company running payroll off an old template has incorrect numbers this month. That's a forcing function for switching, not just a nice-to-have feature.

**Positioning against alternatives:**
| Alternative | Why it loses |
|---|---|
| Excel template | Breaks silently when brackets change; no audit trail; one person's tribal knowledge |
| Foreign payroll SaaS (Gusto, QuickBooks Payroll, Zoho) | Doesn't model Ethiopian PAYE/pension at all; no Birr billing |
| Local ERP consultant install | Expensive, slow to update, sold as a project not a subscription |
| Manual accountant/bookkeeper | Doesn't scale past ~20 employees without errors creeping in |

**Who we are NOT for (yet):** Companies needing multi-country payroll, complex shift-based overtime, or union-negotiated pay scales. That's a v2+ problem.

---

## 2. Target customer (ICP)

**Primary:** Addis Ababa-based private companies, 10–150 employees, with a bookkeeper or small finance team but no dedicated payroll software — trading companies, manufacturers, NGOs, mid-size retail chains, hospitality groups.

**Buyer:** Finance manager, office manager, or owner-operator (in smaller firms, the owner signs off directly).

**Trigger moments to sell into:**
- Right now, post-tax-reform (every existing customer needs to recheck their numbers)
- New fiscal year payroll setup
- After a penalty/audit scare from ERCA
- When their bookkeeper who "knew the formulas" leaves

---

## 3. What's already built (Phase 0 — done)

A working local-run technical prototype, zero external dependencies, fully tested:

- ✅ Multi-tenant company accounts (register/login, scrypt password hashing, session cookies)
- ✅ Employee CRUD (name, Amharic name field, position, gross salary, pension-exemption flag, status)
- ✅ Payroll engine: PAYE (6 brackets, Proclamation No. 1395/2026) + pension (7%/11%, ETB 15,000 cap) — 7 automated tests passing against published worked examples
- ✅ Payroll run workflow: select period → calculate → store → view
- ✅ Printable HTML payslips with compliance-stamp branding
- ✅ CSV export formatted for accountant/ERCA/pension handoff
- ✅ Dashboard with headline stats
- ✅ Design system (teal/ochre visual identity, responsive layout)

**What this proves:** the hardest, most valuable part — the calculation engine — is correct and well-tested. What's *not* proven yet: that real Ethiopian finance staff will trust it, pay for it, and use it monthly without hand-holding. That's the next phase.

---

## 4. Gap between "code prototype" and "real MVP a stranger can pay for"

This is the most important section. A lot of unglamorous work sits between what exists and what's sellable.

### Must-have before first paying pilot (Phase 1)
- [ ] **Independent accuracy review** — get an Ethiopian accountant or ex-ERCA auditor to check the tax engine against a real filing. Non-negotiable for a compliance product; one bad calculation kills trust permanently.
- [ ] **Real PDF payslips** (not browser print-to-PDF) — needs a proper hosting environment with npm access for a PDF library.
- [ ] **Production-grade hosting** — HTTPS, a real domain, off the experimental `node:sqlite` module and onto Postgres or `better-sqlite3`.
- [ ] **Transport allowance handling** — almost every real Ethiopian payslip has a non-taxable transport allowance line; the MVP currently only does flat gross salary.
- [ ] **Basic onboarding flow** — CSV bulk-import for employees, since no one will hand-type 40 employees one at a time during a sales demo.
- [ ] **Forgot-password flow** — currently has none; a single-admin SaaS without password recovery will generate support tickets immediately.

### Should-have before charging money (Phase 2)
- [ ] In-app billing via **Chapa** or **SantimPay** (Birr subscription payment, no manual invoicing)
- [ ] Multi-user-per-company roles (admin vs. viewer) — needed the moment a customer has more than one finance staffer
- [ ] Audit log (who ran payroll, when, any edits) — compliance buyers will ask for this
- [ ] Email notifications (payroll run completed, rate schedule updated)
- [ ] Simple in-app "what changed and why" banner whenever tax brackets are updated — this is your retention moat made visible

### Nice-to-have, defer past first 10 customers (Phase 3+)
- [ ] Ethiopian calendar display toggle
- [ ] Overtime, bonus, and leave-deduction handling
- [ ] Bank-file export formats matching specific Ethiopian banks' bulk-payment templates
- [ ] Mobile app / mobile-responsive polish beyond current basic responsiveness
- [ ] API for accounting-software integrations

---

## 5. Pricing & monetization

**Model:** flat monthly subscription, tiered by employee count, billed in ETB.

| Tier | Employees | Price (ETB/month) | Approx. USD equiv.* |
|---|---|---|---|
| Starter | up to 15 | 1,200 | ~$7–8 |
| Growth | 16–50 | 2,800 | ~$16–18 |
| Business | 51–150 | 6,000 | ~$35–39 |
| Enterprise | 150+ | Custom | Custom |

*USD figures are illustrative only, given Birr volatility (~155–177/USD as of early 2026) — price and think in Birr, not dollars.

**Why flat-per-tier over per-employee metering:** Ethiopian SME finance buyers respond better to a predictable flat number than a usage-based bill that fluctuates with headcount — easier to get approved internally as a fixed line item.

**Founding-customer offer (first 10–15 pilots):** 3 months free or heavily discounted in exchange for a testimonial, a logo, and direct feedback access (e.g., a WhatsApp group with you). Free pilots are how you get the accuracy review validated in the wild before asking strangers to pay.

**Realistic revenue math at 150–400 paying customers** (per earlier market analysis): roughly ETB 4–7 million/month, or **$25,000–45,000/month equivalent** — a solid, profitable small-team business, not a venture outcome. Treat this as the honest target, not a hockey-stick projection.

---

## 6. Go-to-market plan

**Channel priority, in order of expected efficiency for this specific market:**

1. **Direct relationships through accountants and bookkeepers.** They serve multiple SME clients and are the highest-leverage distribution channel in a market where businesses trust a known professional over an unknown app. Pitch: "this makes your job easier and makes you look good to your clients," not just "buy software."
2. **Warm referrals from the founder's existing network** — Ethiopian business associations, Addis Chamber of Commerce contacts, LinkedIn/Telegram groups for Ethiopian finance professionals.
3. **Content that rides the tax-reform news cycle** — a simple "what Proclamation 1395/2026 means for your payroll" explainer (blog post, LinkedIn post, or one-pager) positions you as the person who's already tracking this, and doubles as organic lead gen.
4. **Targeted outreach to mid-size private schools, NGOs, and trading companies** — sectors identified as having real payroll pain and actual budget, contacted directly rather than waiting for inbound.

**What does NOT work here (don't waste budget):** broad paid digital ads. Given low card-payment/online-ad-conversion infrastructure and a relationship-driven B2B buying culture, paid acquisition will burn cash with little to show for it at this stage.

---

## 7. Validation plan — how you'll know this is working

Don't just build; check these signals at each phase gate before investing further.

| Signal | Target by end of Phase 1 (pilots) | Target by end of Phase 2 (paid launch) |
|---|---|---|
| Pilot companies onboarded | 5–10 | — |
| Payroll runs completed without a reported calculation error | 100% | 100% |
| Pilot → paying conversion rate | — | ≥50% of pilots convert |
| Paying customers | 0 (pilot phase) | 15–30 |
| Monthly churn | n/a | <5%/month |
| Net Promoter feedback from finance staff using it | Mostly positive, specific complaints logged | — |

**Kill/pivot criteria, stated honestly in advance:** if after 10 real pilot companies you cannot get even 3 to convert to paying, or if the accuracy review surfaces a structural problem with the calculation approach, stop and re-diagnose before scaling spend or outreach — don't push a broken product harder.

---

## 8. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tax engine has an undetected error | Medium | Severe (trust-ending) | Independent accountant review before first real payroll run; conservative rollout (pilot customers only, manual cross-check first 2–3 runs) |
| ERCA changes brackets again | Medium-High (happened twice recently) | Medium if caught fast, severe if missed | Subscribe to ERCA/MoF announcement channels; build the "rate schedule last verified on X date" banner into the product now |
| Forex/Birr volatility erodes real revenue value | High (structural) | Medium | Price and operate entirely in Birr; treat any USD value as informational only |
| Low willingness to pay vs. "I'll just keep using Excel" | Medium | High | Found the tax-reform urgency as the wedge; founding-customer discounts to get early proof points; lean on accountant channel where the pain is already felt |
| Slow enterprise-style sales cycles for finance software | High | Medium | Pipeline multiple pilots in parallel rather than depending on any single deal; keep pilots free/cheap to lower the decision bar |
| Competitor (local or foreign) copies the approach | Low-Medium near-term | Medium | The moat is regulatory tracking speed + local trust relationships, not the code — keep shipping rate updates faster than anyone else bothers to |

---

## 9. Resourcing & budget (lean case)

Assuming a solo founder or small 2–3 person team:

- **Engineering:** finish Phase 1 must-haves — realistically 3–5 weeks of focused work once on a normal internet-connected dev environment (PDF generation, real DB, allowance handling, CSV import, password reset).
- **Compliance review:** budget for one paid consultation with an Ethiopian accountant or tax advisor to sign off on the engine — treat this as non-negotiable spend, not optional.
- **Hosting:** a small VPS or platform-as-a-service (e.g., Render, Railway) — low monthly cost (likely under $20–30/month at pilot scale).
- **Payment integration:** Chapa/SantimPay integration — primarily engineering time, modest transaction fees thereafter.
- **Sales/GTM time:** the founder's own time doing direct outreach to accountants and pilot companies; this is relationship-driven and can't be outsourced early.

---

## 10. 90-day execution timeline

**Weeks 1–2 — Harden the core**
- Move to a real dev environment with npm access; swap in production DB and PDF generation
- Add transport allowance handling and CSV bulk employee import
- Add password reset flow
- Commission the independent accuracy review; iterate on any findings

**Weeks 3–4 — Recruit pilots**
- Identify and personally reach out to 15–20 target companies/accountants
- Goal: 5–10 committed pilot users running at least one real payroll cycle
- Ship the "rate schedule last verified" banner and basic audit log alongside this

**Weeks 5–8 — Run pilots, fix friction**
- Support pilots through 1–2 real monthly payroll cycles each
- Track every confusion point, support question, and feature request
- Integrate Chapa/SantimPay billing
- Add multi-user roles if any pilot has more than one finance staffer

**Weeks 9–12 — Convert to paid, soft-launch**
- Convert willing pilots to paying customers at founding-customer pricing
- Publish the tax-reform explainer content piece publicly to start inbound interest
- Begin outreach to a second wave of 20–30 prospects through the accountant channel
- Reassess against the validation targets in Section 7 before deciding how hard to push growth spend

**Month 4 onward — scale what worked**
- Double down on whichever channel (accountant referrals vs. direct outreach vs. content) actually produced paying customers
- Revisit the "should-have" feature list based on real customer requests rather than assumptions
- Consider whether the school-management or POS ideas from the original market analysis are worth a second product line, or whether to go deep on payroll first

---

## 11. What success looks like at the end of this plan

Not a unicorn outcome — a real, profitable, trusted local business: 15–30 paying companies, a validated and accountant-approved tax engine, a repeatable sales motion through the accountant channel, and a product that's proven it can survive at least one more ERCA rate change without breaking customer trust. That's the foundation everything else (school management, POS, scaling beyond Addis Ababa, beyond Ethiopia) gets built on top of.
