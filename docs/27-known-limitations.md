# Known Limitations — Habesha Payroll

**Related documents:** [07-mvp-definition.md](./07-mvp-definition.md) · [28-future-enhancements.md](./28-future-enhancements.md) · [24-deployment-guide.md](./24-deployment-guide.md)

This document lists **documented gaps** between the current implementation and a production commercial product. Items marked **Implemented** are included only where partial behavior needs clarification.

---

## Compliance & accuracy

| Limitation | Severity | Detail |
|------------|----------|--------|
| No independent accountant sign-off in repo | Critical | Business plan requires external validation — **Needs Confirmation** |
| Tax rules manually maintained | High | No ERCA API; updates require code change + tests |
| Contract/vehicle transport rules not modeled | Medium | Exemption logic only; legal qualifiers not enforced |
| Historical runs not recalculated on rule change | Medium | Stored snapshots remain under old `rate_version` |

---

## Payroll scope

| Limitation | Status |
|------------|--------|
| Overtime (Labour Proclamation rates) | ❌ Not implemented |
| Bonuses / commissions | ❌ |
| Leave / unpaid absence deductions | ❌ |
| Housing or other allowances | ❌ |
| Mid-month hires / pro-ration | ❌ |
| Arrears / retroactive adjustments | ❌ |
| Multiple pay frequencies (weekly) | ❌ Monthly only |

---

## Product & platform

| Limitation | Detail |
|------------|--------|
| Subscription billing | ❌ No Chapa/SantimPay |
| Outbound email | ❌ Reset/invite links shown on screen |
| Production deployment | ❌ Not configured in repository |
| Login rate limiting | ❌ |
| HTTPS / Secure cookies | ❌ Not enforced |
| Health check endpoint | ❌ |
| Automated backups | ❌ |
| CI/CD pipeline | ❌ |
| Application monitoring | ❌ |

---

## Data & architecture

| Limitation | Detail |
|------------|--------|
| SQLite single file | Fine for pilot; limited concurrent write scale |
| Global rate verification log | Not per-company |
| Employment status vocabulary | UI uses `terminated`; seed may use `inactive` |
| No email change for users | Email read-only |
| Company/profile edits not audited | Gap vs employee/payroll audit coverage |

---

## UI & UX

| Limitation | Detail |
|------------|--------|
| Workspace search | TopBar input is non-functional placeholder |
| Viewer sees some admin buttons | Delete payroll visible; API returns 403 |
| `/payroll-run` URL not route-guarded | API blocks viewers |
| Ethiopian calendar | Gregorian periods only |
| Mobile optimization | Responsive CSS only; no native app |
| Localization | English UI; Amharic on payslips only |

---

## Documentation & repo hygiene

| Limitation | Detail |
|------------|--------|
| Root README outdated | Still describes zero-deps, node:sqlite, vanilla JS |
| Build plan status table outdated | Phase A marked pending |
| SQLite WAL files | May appear in git status if not gitignored |

---

## Testing gaps

| Limitation | Detail |
|------------|--------|
| No HTTP integration tests | Auth, tenant isolation not automated |
| No E2E browser tests | Manual pilot testing required |
| No load testing | ZIP/PDF generation limits unknown |

---

## Security limitations

| Limitation | Detail |
|------------|--------|
| No CSRF protection | SameSite=Lax only |
| No session rotation on login | |
| No account lockout | |
| No 2FA | |
| Secrets in env | No `.env` pattern documented |

---

## Partial implementations (clarification)

| Feature | Limitation |
|---------|------------|
| Password reset | ✅ Works; ❌ not emailed |
| Team invites | ✅ Works; ❌ not emailed |
| Notifications | ✅ In-app; ❌ email |
| PDF payslips | ✅ Server PDF; HTML retained as preview |
| Database | ✅ better-sqlite3; ❌ Postgres option |

---

## README limitations (original — mostly addressed)

The root `README.md` still lists several limitations that are **now partially or fully resolved** in code:

| README claim | Current reality |
|--------------|-----------------|
| Zero npm dependencies | ❌ Outdated — pdfkit, jszip, better-sqlite3 |
| HTML-only payslips | ❌ Outdated — PDF + ZIP exist |
| No transport allowance | ❌ Outdated — implemented |
| No multi-user roles | ❌ Outdated — admin/viewer |
| No audit log | ❌ Outdated — implemented |

Refer to [09-feature-list.md](./09-feature-list.md) for authoritative status.

---

## Pilot usage guidance

Until limitations above are addressed:

1. Manually verify first payroll runs against accountant spreadsheets.  
2. Do not rely on email-based recovery in production without SMTP integration.  
3. Back up `data/payroll.db` before upgrades.  
4. Treat tax engine updates as compliance releases requiring test + review.
