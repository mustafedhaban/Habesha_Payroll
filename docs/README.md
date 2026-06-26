# Habesha Payroll — Documentation Index

**Product version:** 0.1.0  
**Last updated:** 2026-06-24

Professional documentation for the Habesha Payroll MVP. All content is derived from source code and in-repo planning documents unless marked **Needs Confirmation**.

---

## Product & business

| # | Document | Description |
|---|----------|-------------|
| 01 | [Product Brief](./01-product-brief.md) | Executive summary and scope |
| 02 | [Problem Statement](./02-problem-statement.md) | Business problem and pain points |
| 03 | [Target Users](./03-target-users.md) | ICP and role segments |
| 04 | [User Personas](./04-user-personas.md) | Persona profiles |
| 05 | [Market Position](./05-market-position.md) | Positioning and alternatives |
| 06 | [Vision](./06-vision.md) | Long-term direction and principles |
| 07 | [MVP Definition](./07-mvp-definition.md) | In/out of scope for MVP |
| 08 | [Product Roadmap](./08-product-roadmap.md) | Phase A/B/C timeline |

---

## Requirements

| # | Document | Description |
|---|----------|-------------|
| 09 | [Feature List](./09-feature-list.md) | Implemented vs planned features |
| 10 | [PRD](./10-prd.md) | Product requirements document |
| 11 | [User Stories](./11-user-stories.md) | User stories by role |
| 12 | [Business Rules](./12-business-rules.md) | Tax, payroll, and auth rules |
| 13 | [Acceptance Criteria](./13-acceptance-criteria.md) | Testable acceptance criteria |

---

## Technical

| # | Document | Description |
|---|----------|-------------|
| 14 | [System Architecture](./14-system-architecture.md) | High-level architecture |
| 15 | [Module Documentation](./15-module-documentation.md) | Backend and frontend modules |
| 16 | [Database Design](./16-database-design.md) | Schema and ERD |
| 17 | [API Specification](./17-api-specification.md) | REST API reference |
| 18 | [Permission Matrix](./18-permission-matrix.md) | Role-based access |
| 19 | [Workflows](./19-workflows.md) | End-to-end process flows |
| 20 | [UI Specification](./20-ui-specification.md) | Routes, layout, design system |
| 21 | [Technical Specification](./21-technical-specification.md) | Runtime, deps, security |
| 29 | [Architecture Decisions](./29-architecture-decisions.md) | ADR log |

---

## Delivery & operations

| # | Document | Description |
|---|----------|-------------|
| 22 | [Development Roadmap](./22-development-roadmap.md) | Engineering priorities |
| 23 | [Testing Strategy](./23-testing-strategy.md) | Test approach and gaps |
| 24 | [Deployment Guide](./24-deployment-guide.md) | Build, run, deploy |
| 27 | [Known Limitations](./27-known-limitations.md) | Gaps and partial features |
| 28 | [Future Enhancements](./28-future-enhancements.md) | Planned improvements |
| 30 | [Lessons Learned](./30-lessons-learned.md) | Project insights |

---

## End-user guides

| # | Document | Description |
|---|----------|-------------|
| 25 | [User Manual](./25-user-manual.md) | All authenticated users |
| 26 | [Admin Manual](./26-admin-manual.md) | Administrators only |

---

## Quick links by role

| Role | Start here |
|------|------------|
| **Product / business** | 01 → 08 → 10 |
| **Engineer (new)** | 14 → 15 → 17 → 21 |
| **QA** | 13 → 23 |
| **DevOps** | 24 → 27 |
| **Company admin** | 26 → 19 |
| **Finance viewer** | 25 |

---

## Source of truth hierarchy

1. `src/taxEngine.js` + `test/taxEngine.test.js` — tax rules  
2. `src/server.js` + `src/routes/*` — API behavior  
3. `src/db.js` — data model  
4. `web/src/router/index.tsx` — UI routes  
5. This `/docs` set — synthesized documentation  
6. Root `README.md` / build plan — **may be stale**; see [27-known-limitations.md](./27-known-limitations.md)

---

## Related repository files

| File | Purpose |
|------|---------|
| `habesha-payroll-build-plan.md` | Original engineering phases |
| `habesha-payroll-mvp-plan.md` | Business and GTM plan |
| `.cursor/rules/project.mdc` | Agent/compliance workflow rules |
