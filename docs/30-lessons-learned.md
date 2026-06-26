# Lessons Learned — Habesha Payroll

**Related documents:** [29-architecture-decisions.md](./29-architecture-decisions.md) · [27-known-limitations.md](./27-known-limitations.md)

This document captures **observations from the codebase evolution and planning documents**. Items reflect implemented reality, not post-mortem interviews — **Needs Confirmation** where noted for team retrospective validation.

---

## 1. Isolate compliance logic early

**Observation:** `src/taxEngine.js` is the most documented and tested module.

**Lesson:** For regulated domains, a single authoritative calculation module with version stamps (`RATE_VERSION`) and automated worked-example tests pays dividends before UI polish.

**Applied:** 11+ tax tests; agent rules forbid casual bracket edits.

---

## 2. Accuracy beats UI in sequencing

**Observation:** Build plan explicitly prioritizes payslip correctness over features like billing.

**Lesson:** Transport allowance (A1) was sequenced before billing because wrong tax numbers destroy trust instantly.

**Applied:** Phase A complete before Phase B monetization.

---

## 3. Documentation drift is a real risk

**Observation:** Root `README.md` still describes zero-dependency vanilla JS while the app uses React, npm packages, and PDF generation.

**Lesson:** When architecture pivots (sandbox → full npm environment), update primary docs in the same sprint or mislead every new contributor.

**Action:** This `/docs` set and README update recommended — see [22-development-roadmap.md](./22-development-roadmap.md).

---

## 4. Dev shortcuts must be labeled temporary

**Observation:** Password reset and invites return links in API responses (`devResetLink`, `devInviteLink`).

**Lesson:** Ship usable flows without email, but name them as dev/pilot behavior to avoid accidental production deployment.

**Risk:** Users may assume email works — document clearly in [25-user-manual.md](./25-user-manual.md).

---

## 5. API-first authorization beats UI-only gating

**Observation:** Viewers are blocked server-side (`requireAdmin`) but some admin buttons still render (e.g. delete payroll).

**Lesson:** Always enforce permissions on API; treat UI gating as UX enhancement, not security.

**Gap:** Align UI with [18-permission-matrix.md](./18-permission-matrix.md).

---

## 6. Zero-dependency bootstrap has limits

**Observation:** Project started without npm; later adopted `better-sqlite3`, `pdfkit`, `jszip`.

**Lesson:** Constraint-driven simplicity is good for demos; plan explicit migration points (Phase B) before customers depend on production features like PDF.

**Note:** `archiver` was rejected (ESM-only) in favor of `jszip` — verify package CommonJS compatibility early.

---

## 7. Preview-before-commit reduces payroll errors

**Observation:** `POST /api/payroll/preview` added after initial run-only workflow.

**Lesson:** Destructive-or-audited actions (payroll runs) benefit from dry-run mode — especially when duplicate periods require delete.

---

## 8. Snapshots simplify audit; complicate rule changes

**Observation:** `payroll_items` store frozen figures; `rate_version` on run header.

**Lesson:** Good for compliance history; plan explicitly for "rules changed mid-year" scenarios (recalc tooling or legal guidance).

**Status:** Recalc not implemented — see [27-known-limitations.md](./27-known-limitations.md).

---

## 9. Customer-triggered backlog prevents over-engineering

**Observation:** Build plan Phase C lists overtime, bank files, etc. with explicit "build when customer asks" triggers.

**Lesson:** For early-stage compliance SaaS, speculative features dilute focus from tax accuracy and onboarding.

---

## 10. Seed data accelerates demos and QA

**Observation:** `scripts/seed.js` creates realistic bracket coverage, inactive employee, pension-exempt expat, and sample runs.

**Lesson:** Invest in repeatable demo tenants early — sales demos and manual testing share the same asset.

---

## 11. Notifications without email still add value

**Observation:** In-app notifications added for payroll, rate verify, invites — actor excluded from self-notification.

**Lesson:** Partial notification system beats mock UI (hardcoded badge) for multi-user teams; email remains Phase B enhancement.

---

## 12. Test coverage should match risk, not lines of code

**Observation:** 26 tests — heavy on tax engine; none on HTTP layer.

**Lesson:** Correct prioritization for compliance; next increment should be tenant isolation integration tests before scale.

See [23-testing-strategy.md](./23-testing-strategy.md).

---

## 13. Global vs tenant data needs explicit design

**Observation:** `rate_schedule_checks` is global; everything else is `company_id` scoped.

**Lesson:** Document assumptions (national uniform rates) to avoid future multi-tenant confusion.

---

## 14. Employment status vocabulary matters

**Observation:** Seed uses `inactive`; UI uses `terminated`; filter uses `active`.

**Lesson:** Enforce enum consistency at schema + API validation layer early.

---

## 15. Compliance products need external validation loop

**Observation:** Business plan mandates accountant review; not recorded in repository.

**Lesson:** Treat external sign-off as a **release artifact**, not an informal step — especially before pilot payroll on real companies.

**Status:** **Needs Confirmation** — process not yet established.

---

## Summary table

| Lesson | Category | Action state |
|--------|----------|--------------|
| Isolate tax engine | Architecture | ✅ Done |
| Test worked examples | Quality | ✅ Done |
| Update docs with stack | Process | 🟡 This doc set |
| Replace dev email shortcuts | Product | ❌ Phase B4 |
| API permission tests | Quality | ❌ Recommended |
| UI permission alignment | UX | ❌ Recommended |
| Accountant sign-off | Compliance | ❌ Needs Confirmation |

---

## Recommended retrospectives

**Needs Confirmation** — schedule after:
1. First pilot company completes 3 payroll cycles  
2. Phase B deployment to staging  
3. First ERCA rate change post-launch  

Capture outcomes back into this document and [29-architecture-decisions.md](./29-architecture-decisions.md).
