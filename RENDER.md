# Deploy Habesha Payroll on Render

**Repo:** [mustafedhaban/Habesha_Payroll](https://github.com/mustafedhaban/Habesha_Payroll)

---

## Option A — Blueprint (recommended)

Uses [`render.yaml`](./render.yaml) in this repo.

1. Sign in at [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect GitHub account and select **mustafedhaban/Habesha_Payroll**
4. Render reads `render.yaml` and creates the **habesha-payroll** web service
5. Confirm **Starter** plan (required for persistent disk — SQLite lives in `data/`)
6. Click **Apply** and wait for the first deploy (~5–10 min)

Your app will be at: `https://habesha-payroll.onrender.com` (or similar).

---

## Option B — Manual web service

| Setting | Value |
|---------|-------|
| **Environment** | Node |
| **Branch** | `main` |
| **Build command** | `npm install && npm run build:web` |
| **Start command** | `npm start` |
| **Health check path** | `/api/health` |

**Environment variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.5.0` |

**Persistent disk** (Starter plan or higher):

| Setting | Value |
|---------|-------|
| Mount path | `/opt/render/project/src/data` |
| Size | 1 GB |

Without a disk, SQLite data is lost on every redeploy.

---

## After deploy

1. Open the Render URL → **Register company** and create an admin account  
2. Optional demo data: run seed locally only — for production, register fresh  
3. Custom domain: Render dashboard → service → **Settings** → **Custom Domains**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on `better-sqlite3` | Ensure `NODE_VERSION=22.5.0` |
| 503 / “Frontend not built” | Check build logs; `npm run build:web` must succeed |
| Sessions lost after redeploy | Attach persistent disk at path above |
| Login works locally but not on Render | HTTPS requires `NODE_ENV=production` (Secure cookies) |

More detail: [docs/24-deployment-guide.md](./docs/24-deployment-guide.md)
