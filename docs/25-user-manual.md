# User Manual — Habesha Payroll

**Audience:** All authenticated users (admins and viewers)  
**Related documents:** [26-admin-manual.md](./26-admin-manual.md) · [19-workflows.md](./19-workflows.md) · [27-known-limitations.md](./27-known-limitations.md)

---

## Getting started

### Sign in
1. Open the application URL (local dev: `http://localhost:5173` or production URL).  
2. Enter your **email** and **password**.  
3. Click **Sign in**.

### Register a new company (first-time setup only)
1. On the login page, switch to **Register**.  
2. Enter **company name**, your **name**, **email**, and **password** (minimum 8 characters).  
3. You become the company **administrator**.

---

## Dashboard

After sign-in you land on the **Operating dashboard**.

| Section | What it shows |
|---------|---------------|
| Rate banner | When PAYE rates were last verified |
| KPI cards | Active employees, monthly gross, payroll run count, last run |
| Payroll briefing | Summary of roster readiness |
| Live queue | Recent activity (last 6 events) |

**Quick links:** History, Manage employees, View activity.

---

## Viewing employees

Navigate: **Employees** in the sidebar.

| If you are… | You can… |
|-------------|----------|
| **Viewer** | Browse the roster; see names, salaries, status |
| **Admin** | Also add, edit, delete, and import employees |

Employee fields include basic salary, transport allowance, pension exemption, and optional Amharic name.

---

## Payroll history & payslips

Navigate: **History**

1. Click **View** on a payroll period.  
2. Review line-by-line totals for each employee.  
3. Download outputs:

| Output | How |
|--------|-----|
| **CSV** | CSV button on run row — for accountant / filing |
| **Single PDF** | PDF link per employee in detail view |
| **HTML payslip** | View link — use browser Print if needed |
| **All PDFs** | **All payslips (ZIP)** in detail view |

All users with access can download exports for their company.

---

## Activity log

Navigate: **Activity**

Read-only list of who performed actions (employee changes, payroll runs, invites, rate verifications).

---

## Notifications

Click the **bell icon** in the top bar.

| Action | Result |
|--------|--------|
| Open panel | See recent notifications |
| Click item | Marks read and opens related page |
| Mark all read | Clears unread badge |

Notifications are **in-app only** — email alerts are not available yet.

---

## Your profile

Navigate: **Settings** → **Your profile** (or click your name in the top bar)

| Task | Steps |
|------|-------|
| Change display name | Edit name → **Save profile** |
| Change password | Enter current + new password → **Update password** |

Email address cannot be changed in the app.

---

## Settings (viewers)

Viewers can see:
- Company name and TIN (read-only if not admin)  
- Team member list  
- Tax rate schedule status  

Viewers **cannot** invite teammates or edit company details.

---

## Password recovery

1. From login, open **Forgot password**.  
2. Enter your email.  
3. **Development/pilot note:** The reset link appears on screen instead of email. Copy the link and open it in your browser.  
4. Set a new password on the reset page.

---

## Accepting an invite

1. Open the invite link from your admin (`/accept-invite?token=...`).  
2. Confirm company and email.  
3. Set your name and password.  
4. You are signed in automatically.

---

## Dark mode

Toggle sun/moon icon in the top bar. Preference is saved in your browser.

---

## Getting help

| Issue | Action |
|-------|--------|
| Cannot sign in | Use forgot password; contact your company admin |
| Wrong payroll numbers | Ask admin to review employee data and re-run |
| Need edit access | Ask admin for admin role or correct invite |

**Needs Confirmation:** formal support channel (email, phone, SLA).

---

## What this app does not do (today)

See [27-known-limitations.md](./27-known-limitations.md) for the full list. Examples:
- Overtime and bonuses  
- Email notifications  
- Ethiopian calendar periods  
- Online subscription payment  

Admins: see [26-admin-manual.md](./26-admin-manual.md) for payroll execution.
