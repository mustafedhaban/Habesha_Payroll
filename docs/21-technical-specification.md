# Technical Specification — Habesha Payroll

**Related documents:** [14-system-architecture.md](./14-system-architecture.md) · [12-business-rules.md](./12-business-rules.md)

**Version:** 0.1.0

---

## Runtime requirements

| Requirement | Value |
|-------------|-------|
| Node.js | ≥ 22.5.0 |
| npm | For `web/` dependencies and root packages |
| OS | Any supporting better-sqlite3 native bindings |
| Port (API) | 3000 default (`PORT` env) |
| Port (Vite dev) | 5173 |

---

## Project structure

```
payroll-mvp/
├── src/                 # Backend
├── web/                 # Frontend (Vite React)
├── test/                # Unit tests
├── scripts/seed.js      # Demo data
├── data/payroll.db      # Runtime DB (gitignored recommended)
├── assets/fonts/        # Noto Sans Ethiopic for PDF
└── docs/                # This documentation set
```

---

## Backend specification

### HTTP server
- **Entry:** `node src/server.js`  
- **Framework:** None — manual pathname routing  
- **Static files:** `web/dist` with SPA fallback  
- **Error handling:** Top-level try/catch → 500 JSON  

### Authentication
| Parameter | Value |
|-----------|-------|
| Algorithm | scrypt (Node crypto) |
| Salt | 16 random bytes hex |
| Hash | 64-byte scrypt output hex |
| Session token | 32 random bytes hex |
| Cookie name | `session` |
| Cookie flags | HttpOnly, Path=/, SameSite=Lax, Max-Age=604800 |
| Session TTL | 7 days |

### Tax engine interface

```javascript
calculatePayroll({
  basicSalary,      // or legacy grossSalary
  transportAllowance,
  isPensionExempt
})
// Returns: basicSalary, transportAllowance, exemptTransport,
// taxableTransport, taxableIncome, grossPay, incomeTax,
// employeePension, employerPension, totalEmployerCost, netPay, rateVersion
```

Constants exported: `RATE_VERSION`, `PAYE_BRACKETS`, pension rates, transport caps.

### Payroll batch processing
1. Load active employees for `company_id`  
2. `calculateItemsForEmployees()` → array of line items  
3. Insert `payroll_runs` + `payroll_items` in loop  
4. Audit + notify  

### PDF generation
- Library: PDFKit  
- Amharic: registers Noto font if file exists  
- Output: Buffer streamed as `application/pdf`  

### ZIP generation
- Library: JSZip  
- One PDF per payroll item  

---

## Frontend specification

### Build
```bash
cd web && npm run build   # tsc -b && vite build
```
Output: `web/dist/`

### Dev proxy
Vite proxies `/api` → `http://localhost:3000`

### API client
```typescript
Api.get/post/put/del(path, body?)
// credentials: 'same-origin'
// throws Error with server message on !ok
```

### TypeScript
Strict project references: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

---

## Database specification

See [16-database-design.md](./16-database-design.md).

| Setting | Value |
|---------|-------|
| Driver | better-sqlite3 |
| Path | `data/payroll.db` |
| WAL | ON |
| Foreign keys | ON |
| Migrations | Inline on startup |

---

## Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | 3000 | API server port |

**No `.env` file in repo.** Additional config **Needs Confirmation**.

---

## Dependencies (production)

### Root `package.json`
| Package | Purpose |
|---------|---------|
| better-sqlite3 | Database |
| pdfkit | PDF payslips |
| jszip | ZIP archives |

### `web/package.json`
| Package | Purpose |
|---------|---------|
| react, react-dom | UI |
| react-router-dom | Routing |
| vite, typescript | Build |

---

## Performance characteristics

| Operation | Notes |
|-----------|-------|
| Payroll run | O(n) employees; synchronous |
| PDF per payslip | Generated on request |
| ZIP export | Generates all PDFs in memory — **Needs Confirmation:** max roster size |
| Activity query | LIMIT 200 |

---

## Logging & monitoring

| Capability | Status |
|------------|--------|
| Structured logging | ❌ console.error on unhandled errors |
| Request logging | ❌ |
| APM / metrics | ❌ |
| Health check endpoint | ❌ |

**Recommendation:** Add `GET /api/health` before deployment.

---

## Security specification (target vs actual)

| Control | MVP | Production target |
|---------|-----|-------------------|
| HTTPS | ❌ | ✅ Required |
| Secure cookie | ❌ | ✅ |
| Rate limit login | ❌ | ✅ |
| CSRF | ❌ | **Needs Confirmation** |
| SQL injection | Mitigated via prepared statements | ✅ |
| Path traversal (static) | Normalized path check in server.js | ✅ |

---

## Versioning

| Artifact | Version |
|----------|---------|
| npm package | 0.1.0 |
| Tax rate version | 2026-Proclamation-1395 |

No API version prefix.
