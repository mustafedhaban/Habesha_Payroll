# Architecture Decision Records — Habesha Payroll

**Related documents:** [14-system-architecture.md](./14-system-architecture.md) · [21-technical-specification.md](./21-technical-specification.md)

Format: Context → Decision → Consequences. Status reflects **current codebase**.

---

## ADR-001: Hand-written HTTP server (no Express)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Original MVP built with zero external dependencies in constrained environment |
| **Decision** | Use `node:http` with manual routing in `server.js` |
| **Consequences** | ✅ No framework overhead; full control. ❌ No middleware ecosystem; routing table grows manually |

---

## ADR-002: SQLite via better-sqlite3

| Field | Value |
|-------|-------|
| **Status** | Accepted (migrated from node:sqlite) |
| **Context** | Need persistent relational storage; pilot-scale concurrency |
| **Decision** | File-based SQLite with `better-sqlite3`, WAL mode, FK constraints |
| **Consequences** | ✅ Simple ops; transactional imports. ❌ Single-writer limits; backup/HA manual. Postgres deferred |

---

## ADR-003: Tax logic isolated in taxEngine.js

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Compliance product; rules change; competitive moat is accuracy |
| **Decision** | Single module owns brackets, pension, transport; exports `RATE_VERSION` |
| **Consequences** | ✅ Testable; updatable. ❌ All consumers depend on one file; requires disciplined change process |

---

## ADR-004: Session cookie authentication

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Browser SPA on same origin as API |
| **Decision** | HttpOnly cookie session tokens; 7-day TTL; scrypt passwords |
| **Consequences** | ✅ Simple SPA integration. ❌ No JWT/mobile API story; CSRF not addressed |

---

## ADR-005: Multi-tenancy via company_id scoping

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | SaaS model — many companies, one deployment |
| **Decision** | Shared database; every tenant table includes `company_id`; session carries tenant |
| **Consequences** | ✅ Simple schema. ❌ Risk of query omission; no row-level security in DB |

---

## ADR-006: React SPA separate from Node (Vite)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Replace vanilla JS pages; modern admin UI |
| **Decision** | `web/` Vite project; production build served by Node; dev proxy to API |
| **Consequences** | ✅ Fast dev UX; TypeScript. ❌ Two processes in dev; build step required |

---

## ADR-007: No global state library on frontend

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | MVP scope; limited shared client state |
| **Decision** | AuthContext only; pages fetch own data via `Api` |
| **Consequences** | ✅ Simple. ❌ Duplicate fetches; no cache invalidation pattern |

---

## ADR-008: Admin/viewer two-role model

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Finance teams need read-only colleagues |
| **Decision** | `users.role` enum; `requireAdmin()` on mutating routes |
| **Consequences** | ✅ Covers common case. ❌ No granular permissions; UI gating incomplete |

---

## ADR-009: Payroll run as immutable snapshot

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Compliance audit; historical accuracy |
| **Decision** | Store calculated line items on `payroll_items`; include `rate_version` on run |
| **Consequences** | ✅ Auditable history. ❌ No edit-in-place; delete + re-run only; no auto-recalc |

---

## ADR-010: PDF payslips via PDFKit (keep HTML preview)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Phase B requirement for server-generated PDFs |
| **Decision** | PDFKit for download; HTML route retained for preview/print |
| **Consequences** | ✅ True PDF delivery. ❌ Sync generation in request; two formats to maintain |

---

## ADR-011: Dev-mode password reset and invite links on screen

| Field | Value |
|-------|-------|
| **Status** | Accepted (temporary) |
| **Context** | No email service in MVP |
| **Decision** | Return `devResetLink` / `devInviteLink` in API response |
| **Consequences** | ✅ Testable flows without SMTP. ❌ Not production-safe; must replace with B4 |

---

## ADR-012: Global rate_schedule_checks table

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | National tax schedule applies to all employers |
| **Decision** | Single verification log not scoped by company |
| **Consequences** | ✅ Simple trust banner. ❌ Cannot track per-tenant verification practices |

---

## ADR-013: In-app notifications (not email) for MVP

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Need awareness of payroll events without email infrastructure |
| **Decision** | `notifications` table; TopBar panel; inline creation on key events |
| **Consequences** | ✅ Works offline from email. ❌ No push/email; user must be logged in |

---

## ADR-014: Test-first policy for tax engine only

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Context** | Highest risk surface |
| **Decision** | Mandatory tests before `taxEngine.js` changes; 26 tests overall |
| **Consequences** | ✅ Strong tax coverage. ❌ API/integration gaps remain |

---

## Deferred decisions (Needs Confirmation)

| Topic | Options under consideration |
|-------|----------------------------|
| Payment provider | Chapa vs SantimPay |
| Production host | Render vs Railway vs VPS |
| Long-term database | SQLite vs Postgres |
| Email provider | **Needs Confirmation** |
| API versioning | None vs `/v1` prefix |

---

## Decision log maintenance

When making new architectural decisions:
1. Add ADR to this document with next sequential ID  
2. Cross-reference in [14-system-architecture.md](./14-system-architecture.md) if structural  
3. Update [27-known-limitations.md](./27-known-limitations.md) if introducing temporary debt  
