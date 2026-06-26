# User Personas — Habesha Payroll

**Related documents:** [03-target-users.md](./03-target-users.md) · [11-user-stories.md](./11-user-stories.md) · [25-user-manual.md](./25-user-manual.md)

Personas combine **implemented role behavior** with **planning-document ICP**. Behavioral quotes are illustrative, not from user research unless noted.

---

## Persona 1: Selam — Finance Manager (Admin)

| Field | Detail |
|-------|--------|
| **Role in app** | `admin` |
| **Job title** | Finance Manager |
| **Company** | Mid-size trading company, ~45 employees |
| **Technical comfort** | Excel-strong; prefers clear numbers over complex ERP |
| **Goals** | Run accurate monthly payroll; produce payslips; export for ERCA/pension filing |
| **Frustrations** | Old Excel broke after 2026 tax reform; fears audit penalties |
| **Uses in app** | Employees, Run Payroll (preview then commit), History, Settings, Activity |

**Representative demo account** (from `scripts/seed.js`):

- Email: `demo@habesha.test`
- Company: Habesha Demo Trading PLC
- **Needs Confirmation:** whether this reflects a real pilot user

---

## Persona 2: Dawit — Junior Accountant (Viewer)

| Field | Detail |
|-------|--------|
| **Role in app** | `viewer` |
| **Job title** | Junior Accountant |
| **Goals** | Review payroll figures, download payslips for staff queries, monitor activity |
| **Frustrations** | Cannot fix data errors without asking admin |
| **Uses in app** | Employees (read-only), Payroll History, Activity, notifications |

**System behavior:** API returns `403` on write operations; UI shows “View-only access” on Employees page.

**Gap:** Some admin-only actions (e.g. Delete payroll button) may still appear in UI — API blocks execution. See [18-permission-matrix.md](./18-permission-matrix.md).

---

## Persona 3: Hana — External Bookkeeper

| Field | Detail |
|-------|--------|
| **Role in app** | None (offline consumer of exports) |
| **Goals** | Receive correct monthly totals and employee lines for filing |
| **Uses** | CSV export from payroll run; optional PDF payslips |

Not a login persona in current MVP.

---

## Persona 4: New Company Owner (First-time registrant)

| Field | Detail |
|-------|--------|
| **Role in app** | Becomes `admin` on registration |
| **Goals** | Set up company, bulk-import employees, run first payroll |
| **Uses** | Login page (Register tab), CSV import, dashboard empty states |

Registration flow: `POST /api/auth/register` creates company + first admin user.

---

## Persona summary matrix

| Persona | App role | Payroll run | Employee edit | Invites | Exports |
|---------|----------|:-----------:|:-------------:|:-------:|:-------:|
| Selam (Finance Manager) | admin | ✅ | ✅ | ✅ | ✅ |
| Dawit (Junior Accountant) | viewer | ❌ | ❌ | ❌ | ✅ |
| Hana (Bookkeeper) | — | — | — | — | ✅ (via client) |
| New Owner | admin | ✅ | ✅ | ✅ | ✅ |
