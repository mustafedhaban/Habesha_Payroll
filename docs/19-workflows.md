# Workflows — Habesha Payroll

**Related documents:** [11-user-stories.md](./11-user-stories.md) · [25-user-manual.md](./25-user-manual.md) · [26-admin-manual.md](./26-admin-manual.md)

---

## 1. Company onboarding

```mermaid
flowchart TD
  A[Visit login page] --> B{New company?}
  B -->|Yes| C[Register tab: company name email password]
  C --> D[POST /api/auth/register]
  D --> E[Session created role admin]
  E --> F[Dashboard]
  B -->|No| G[Sign in]
  G --> F
  F --> H[Add employees manually or CSV import]
  H --> I[Optional: set company TIN in Settings]
```

---

## 2. CSV employee import (admin)

```mermaid
sequenceDiagram
  participant Admin
  participant UI as EmployeesPage
  participant API as /api/employees/import
  participant DB as SQLite

  Admin->>UI: Upload CSV
  UI->>API: POST preview=true
  API-->>UI: Row validation table
  Admin->>UI: Confirm import
  UI->>API: POST preview=false
  API->>DB: BEGIN TRANSACTION
  API->>DB: INSERT valid rows
  API->>DB: COMMIT
  API-->>UI: imported count
  Note over API,DB: audit employee.imported
```

**Required columns:** `full_name`, `basic_salary`

---

## 3. Monthly payroll run (admin)

```mermaid
flowchart TD
  A[Payroll Run page] --> B[Select month and year]
  B --> C[Preview payroll]
  C --> D{Numbers correct?}
  D -->|No| E[Fix employees or period]
  E --> C
  D -->|Yes| F[Run payroll]
  F --> G{Period already exists?}
  G -->|Yes| H[409 error]
  G -->|No| I[Persist run and items]
  I --> J[Audit payroll.run]
  J --> K[Notify other users]
  K --> L[View in History]
  L --> M[Export CSV / PDF / ZIP]
```

**Business rules:** Active employees only; one run per period; rate_version stored.

---

## 4. Payroll correction (admin)

```mermaid
flowchart LR
  A[Mistaken run] --> B[Payroll History]
  B --> C[Delete run]
  C --> D[Audit payroll.deleted]
  D --> E[Fix employee data if needed]
  E --> F[Re-run payroll for period]
```

---

## 5. Teammate invitation (admin)

```mermaid
sequenceDiagram
  participant Admin
  participant API as /api/team/invite
  participant Invitee

  Admin->>API: email + role
  API-->>Admin: devInviteLink displayed
  Admin->>Invitee: Share link manually
  Invitee->>API: GET /api/auth/invite
  Invitee->>API: POST /api/auth/accept-invite
  Note over API: Session created for invitee
```

**Production gap:** Link should be emailed (Phase B4).

---

## 6. Password reset

```mermaid
flowchart TD
  A[Forgot password page] --> B[Enter email]
  B --> C[POST /api/auth/forgot-password]
  C --> D[Display devResetLink on screen]
  D --> E[Reset password page with token]
  E --> F[POST /api/auth/reset-password]
  F --> G[Sign in with new password]
```

---

## 7. Rate schedule verification (admin)

```mermaid
flowchart LR
  A[Settings] --> B[Optional verification note]
  B --> C[Record verification for today]
  C --> D[INSERT rate_schedule_checks]
  D --> E[Audit rate_schedule.verified]
  E --> F[Dashboard banner updates]
  F --> G[Notify company users]
```

---

## 8. Notification consumption (all users)

```mermaid
flowchart TD
  A[Event: payroll / invite / rate verify] --> B[notifications.notifyCompany]
  B --> C[TopBar badge count]
  C --> D[User opens bell panel]
  D --> E[GET /api/notifications]
  E --> F{Click item?}
  F -->|Yes| G[Mark read + navigate link_path]
  F -->|Mark all| H[POST read-all]
```

Poll interval: 60 seconds (`TopBar.tsx`).

---

## 9. Payslip distribution

| Step | Action |
|------|--------|
| 1 | Open Payroll History → View run |
| 2 | Per employee: HTML preview or PDF link |
| 3 | Bulk: Download ZIP of all PDFs |
| 4 | Optional: browser Print → Save as PDF from HTML |

---

## 10. Viewer daily workflow

```mermaid
flowchart LR
  A[Sign in] --> B[Dashboard review]
  B --> C[Employees read-only]
  C --> D[Payroll History]
  D --> E[Download CSV or payslips]
  E --> F[Activity / notifications]
```

Viewers **cannot** run payroll or edit data (API enforced).
