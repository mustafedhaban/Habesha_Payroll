# API Specification — Habesha Payroll

**Related documents:** [18-permission-matrix.md](./18-permission-matrix.md) · [15-module-documentation.md](./15-module-documentation.md)

**Base URL:** `/api`  
**Format:** JSON request/response unless noted  
**Authentication:** Session cookie `session=<token>` (HttpOnly)  
**Error format:** `{ "error": "message" }`

---

## Conventions

| Aspect | Value |
|--------|-------|
| Content-Type (JSON bodies) | `application/json` |
| Credentials | `credentials: 'same-origin'` on client |
| Success codes | 200, 201 as listed |
| Auth failure | 401 |
| Forbidden (viewer) | 403 |
| Validation | 400 |
| Conflict | 409 |
| Not found | 404 |

---

## Authentication

### POST `/api/auth/register`
**Auth:** Public

**Body:**
```json
{
  "companyName": "string",
  "fullName": "string",
  "email": "string",
  "password": "string",
  "tin": "string (optional)"
}
```

**Response 201:**
```json
{
  "user": { "id": 1, "email": "...", "fullName": "...", "role": "admin" },
  "company": { "id": 1, "name": "..." }
}
```

---

### POST `/api/auth/login`
**Auth:** Public

**Body:** `{ "email", "password" }`  
**Response 200:** Same shape as register (no tin on company in login response).

---

### POST `/api/auth/logout`
**Auth:** Session optional  
**Response 200:** `{ "ok": true }`

---

### GET `/api/auth/me`
**Auth:** Session

**Response 200:**
```json
{
  "user": { "id", "email", "fullName", "role" },
  "company": { "id", "name", "tin" }
}
```

---

### POST `/api/auth/forgot-password`
**Auth:** Public

**Body:** `{ "email" }`  
**Response 200:** Always generic message; if user exists includes:
```json
{
  "message": "...",
  "devResetLink": "/reset-password?token=...",
  "devNote": "In production this link would be emailed..."
}
```

---

### POST `/api/auth/reset-password`
**Body:** `{ "token", "password" }` (password ≥ 8 chars)  
**Response 200:** `{ "ok": true, "message": "..." }`

---

### GET `/api/auth/invite?token=...`
**Auth:** Public

**Response 200:** `{ "email", "role", "companyName" }`

---

### POST `/api/auth/accept-invite`
**Body:** `{ "token", "fullName", "password" }`  
**Response 201:** Session created; user + company object.

---

## Employees

### GET `/api/employees`
**Auth:** Session  
**Response:** `{ "employees": [ Employee ] }`

### POST `/api/employees`
**Auth:** Admin

**Body:**
```json
{
  "fullName": "string",
  "fullNameAm": "string | null",
  "position": "string",
  "basicSalary": "number",
  "transportAllowance": "number",
  "isPensionExempt": "boolean",
  "employmentStatus": "active | terminated",
  "startDate": "YYYY-MM-DD | null"
}
```

Legacy alias: `grossSalary` → `basicSalary`

### PUT `/api/employees/:id`
**Auth:** Admin — partial update supported

### DELETE `/api/employees/:id`
**Auth:** Admin

### POST `/api/employees/import`
**Auth:** Admin

**Body:**
```json
{
  "csv": "string",
  "preview": "boolean (optional, default false)"
}
```

**Preview response:** `{ "preview": true, "total", "validCount", "invalidCount", "rows": [...] }`  
**Commit response:** `{ "imported", "skipped", "rows" }`

**Required CSV columns:** `full_name`, `basic_salary`  
**Optional:** `full_name_am`, `position`, `transport_allowance`, `is_pension_exempt`, `start_date`

---

## Payroll

### POST `/api/payroll/preview`
**Auth:** Admin

**Body:** `{ "month": 1-12, "year": number }`

**Response 200:**
```json
{
  "preview": true,
  "month", "year",
  "alreadyRun": false,
  "items": [ { "employeeId", "employeeName", "grossPay", "incomeTax", ... } ],
  "totals": { "grossPay", "incomeTax", "netPay", ... }
}
```

---

### GET `/api/payroll/runs`
**Auth:** Session

**Response:** `{ "runs": [ { "id", "period_month", "period_year", "employee_count", "total_gross", "total_tax", "total_net", ... } ] }`

---

### POST `/api/payroll/runs`
**Auth:** Admin

**Body:** `{ "month", "year" }`  
**Response 201:** `{ "runId", "month", "year", "items", "totals" }`  
**409:** Duplicate period

---

### GET `/api/payroll/runs/:id`
**Auth:** Session  
**Response:** `{ "run": {...}, "items": [...] }`

---

### DELETE `/api/payroll/runs/:id`
**Auth:** Admin  
**Response:** `{ "ok": true }`

---

### GET `/api/payroll/runs/:id/export.csv`
**Auth:** Session  
**Response:** CSV file download

---

### GET `/api/payroll/runs/:id/payslips.zip`
**Auth:** Session  
**Response:** `application/zip`

---

### GET `/api/payroll/runs/:id/payslip/:employeeId`
**Auth:** Session  
**Response:** HTML payslip page

---

### GET `/api/payroll/runs/:id/payslip/:employeeId.pdf`
**Auth:** Session  
**Response:** `application/pdf`

---

## Team

### GET `/api/team`
**Auth:** Session

**Response:**
```json
{
  "members": [ { "id", "email", "full_name", "role", "created_at" } ],
  "pending": [ { "id", "email", "role", "created_at", "expires_at" } ],
  "currentUserId": 1
}
```

---

### POST `/api/team/invite`
**Auth:** Admin

**Body:** `{ "email", "role": "admin" | "viewer" }`

**Response 201:**
```json
{
  "email", "role",
  "devInviteLink": "/accept-invite?token=...",
  "devNote": "..."
}
```

---

## Company

### GET `/api/company`
**Response:** `{ "company": { "id", "name", "tin" } }`

### PUT `/api/company`
**Auth:** Admin  
**Body:** `{ "name", "tin" }`

---

## User profile

### PUT `/api/user/profile`
**Auth:** Session  
**Body:** `{ "fullName" }`  
**Response:** `{ "user": { ... } }`

### POST `/api/user/change-password`
**Auth:** Session  
**Body:** `{ "currentPassword", "newPassword" }`

---

## Rate schedule

### GET `/api/rate-schedule`
**Response:**
```json
{
  "activeVersion": "2026-Proclamation-1395",
  "latest": { "version", "verified_date", "notes" } | null
}
```

### POST `/api/rate-schedule/verify`
**Auth:** Admin  
**Body:** `{ "notes": "optional string" }`

---

## Activity

### GET `/api/activity`
**Response:** `{ "entries": [ { "id", "action", "detail", "created_at", "user_email", "user_name" } ] }`  
Limit: 200 newest

---

## Notifications

### GET `/api/notifications`
**Response:** `{ "items": [...], "unread": number }`

### POST `/api/notifications/:id/read`
**Response:** `{ "ok": true }`

### POST `/api/notifications/read-all`
**Response:** `{ "ok": true }`

---

## Static / SPA

Non-`/api` routes serve `web/dist` with SPA fallback to `index.html`.

---

## API versioning

**Not implemented.** Breaking changes would affect all clients immediately.

**Needs Confirmation:** versioning strategy before public API consumers (Phase C).
