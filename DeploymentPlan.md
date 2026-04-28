# Deployment Plan — Vercel + Render + Supabase + GitHub Actions

**Goal:** ship the app to a custom domain with daily auto-refresh, no servers to manage.

**Stack:**
- Frontend → **Vercel** (`yourdomain.com`)
- Backend (FastAPI) → **Render** Web Service (`api.yourdomain.com`)
- Database → **Supabase** Postgres
- Daily ML refresh → **GitHub Actions** cron

**Status legend:** ✅ done · 🟡 in progress · ❌ not started

---

## Branch strategy — read first

**Work on a branch named `deploy`, not `main`.**

```bash
git checkout -b deploy
git push -u origin deploy
```

Do every phase below on `deploy`. Vercel and Render will auto-create **preview deploys** for the branch (free, separate from production), so you can test the live deployed version without breaking anything.

### Where each phase happens

| Phase | Branch / location |
|---|---|
| P1 — Code prep | `deploy` branch (commit per task) |
| P2 — Supabase | Supabase dashboard (no code) |
| P3 — Render backend | Render dashboard, **point auto-deploy at `deploy`** initially |
| P4 — Vercel frontend | Vercel dashboard, **import the `deploy` branch** for preview URL |
| P5 — Custom domain | DNS provider + Vercel/Render dashboards |
| P6 — GitHub Actions | `.github/workflows/refresh.yml` on `deploy` branch |

### Switching to production

When every smoke-test on `deploy`'s preview URLs passes:

```bash
git checkout main
git merge deploy
git push origin main
```

Then in Vercel/Render, change the **production branch** to `main`. From that point:
- Push to `main` → production deploys to `yourdomain.com`.
- Push to any other branch → preview deploy on a unique URL.

### Caveat — GitHub Actions schedule

`schedule:` triggers only fire on the repo's **default branch** (usually `main`). While testing on `deploy`:
- Use the Actions tab → "Run workflow" → ref `deploy` to trigger manually.
- After merging to `main`, the daily 04:00 UTC schedule starts firing automatically.

---

## Phase 1 — Code prep (local)

Make the codebase deploy-ready. Don't touch any hosting yet.

- [ ] **P1.1** Audit secrets — `grep -rE "api_key|API_FOOTBALL|password" --include="*.py"`. Anything hardcoded moves to `os.environ[...]`.
- [ ] **P1.2** Make `database_init.py` env-driven. Read `DATABASE_URL` from env. Append `?sslmode=require` if not present.
- [ ] **P1.3** Add CORS middleware to FastAPI in `server/main.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["https://yourdomain.com", "http://localhost:5173"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- [ ] **P1.4** Pin `requirements.txt` — `pip freeze > requirements.txt` from the working venv.
- [ ] **P1.5** Confirm frontend reads API URL from `VITE_API_URL` env var (not hardcoded `localhost:8000`).
- [ ] **P1.6** Local end-to-end smoke test: `make refresh-current && python server/ingest_predictions.py` → frontend renders fresh data.
- [ ] **P1.7** Commit + push to `main`.

---

## Phase 2 — Supabase database

Create the hosted DB and verify the schema seeds correctly.

- [ ] **P2.1** Sign up at [supabase.com](https://supabase.com) (GitHub auth).
- [ ] **P2.2** Create new project. Save the password.
- [ ] **P2.3** Settings → Database → copy the **Connection string** (URI format).
- [ ] **P2.4** Append `?sslmode=require` to the string.
- [ ] **P2.5** Test from local machine:
  ```bash
  DATABASE_URL="postgresql://..." python server/seed_db.py
  ```
- [ ] **P2.6** Open Supabase Table Editor → confirm tables exist with rows (`player`, `team`, `match`, etc.).

---

## Phase 3 — Backend on Render

Deploy FastAPI as a Web Service.

- [ ] **P3.1** Sign up at [render.com](https://render.com) (GitHub auth).
- [ ] **P3.2** New → Web Service → connect repo.
- [ ] **P3.3** Configure:
  - **Root directory:** `server`
  - **Build command:** `pip install -r ../requirements.txt`
  - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] **P3.4** Add env vars:
  - `DATABASE_URL` = Supabase connection string
  - `API_FOOTBALL_KEY` = your key
- [ ] **P3.5** Deploy. Wait for green status.
- [ ] **P3.6** Smoke-test: `curl https://<service>.onrender.com/players` returns JSON.

---

## Phase 4 — Frontend on Vercel

Deploy the static frontend.

- [ ] **P4.1** Sign up at [vercel.com](https://vercel.com) (GitHub auth).
- [ ] **P4.2** Import repo → set root directory to `frontendUpdatedSoccer2`.
- [ ] **P4.3** Add env var: `VITE_API_URL=https://<service>.onrender.com` (temporary Render URL for now).
- [ ] **P4.4** Deploy.
- [ ] **P4.5** Smoke-test the temporary Vercel URL in a browser. Network tab should show calls to the Render backend.

---

## Phase 5 — Custom domain

Wire your domain to Vercel and Render.

- [ ] **P5.1** Vercel → Project → Settings → Domains → add `yourdomain.com` and `www.yourdomain.com`. Note the DNS records Vercel shows.
- [ ] **P5.2** Render → Service → Settings → Custom Domain → add `api.yourdomain.com`. Note the CNAME.
- [ ] **P5.3** At your DNS provider (or Cloudflare), add the records:
  - `A @ <Vercel apex IP>`
  - `CNAME www cname.vercel-dns.com`
  - `CNAME api <render-target>.onrender.com`
- [ ] **P5.4** Wait for DNS propagation (5–60 min). Verify with `dig api.yourdomain.com`.
- [ ] **P5.5** Update Vercel env var: `VITE_API_URL=https://api.yourdomain.com`. Redeploy.
- [ ] **P5.6** Update CORS in `server/main.py` to include final domain. Redeploy backend.
- [ ] **P5.7** Final smoke test: visit `https://yourdomain.com`, confirm data loads from `https://api.yourdomain.com`.

---

## Phase 6 — GitHub Actions daily refresh

Automate the ML pipeline + DB ingest.

- [ ] **P6.1** GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
  - `API_FOOTBALL_KEY`
  - `DATABASE_URL`
- [ ] **P6.2** Create `.github/workflows/refresh.yml`:
  ```yaml
  name: Daily ML refresh
  on:
    schedule:
      - cron: "0 4 * * *"
    workflow_dispatch:
  jobs:
    refresh:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with: { python-version: "3.14" }
        - run: pip install -r requirements.txt
        - name: Run ML pipeline
          env:
            API_FOOTBALL_KEY: ${{ secrets.API_FOOTBALL_KEY }}
          run: cd ml && make refresh-current && make refresh-injuries
        - name: Ingest to DB
          env:
            DATABASE_URL: ${{ secrets.DATABASE_URL }}
          run: cd server && python -c "import ingest_predictions; ingest_predictions.main()"
  ```
- [ ] **P6.3** Commit + push.
- [ ] **P6.4** Actions tab → "Run workflow" manually. Confirm green.
- [ ] **P6.5** Verify Supabase Table Editor shows updated `generated_at` / fresh rows.

---

## Phase 7 — Hardening (optional, do after demo works)

- [ ] **P7.1** Add **healthchecks.io** ping at the end of the GHA workflow so silent failures alert you.
- [ ] **P7.2** Render free tier sleeps after 15 min idle — add a UptimeRobot ping every 10 min on `api.yourdomain.com/health` to keep it warm. (Or upgrade Render to $7/mo.)
- [ ] **P7.3** Cache `data/` and `models/` between GHA runs with `actions/cache@v4` to cut runtime from ~10 min to ~3 min.
- [ ] **P7.4** Add a `/health` endpoint to FastAPI that returns DB connection status.
- [ ] **P7.5** Write a one-page `DEPLOY.md` runbook: how to redeploy, where to find logs, how to manually trigger a refresh.

---

## Sequencing notes

- **Don't skip Phase 1.** Deploying with hardcoded secrets is the #1 way school projects leak API keys to GitHub.
- **Phases 2–4 can be done in parallel** by different team members once Phase 1 is merged.
- **Phase 5 (domain) must come after Phases 3 & 4** — you need the temporary URLs working first.
- **Phase 6 must come last** — GHA needs `DATABASE_URL` from Phase 2 and the working ingest script.

## Estimated time

| Phase | Time |
|---|---|
| P1 — Code prep | 1–2 h |
| P2 — Supabase | 30 min |
| P3 — Render backend | 45 min |
| P4 — Vercel frontend | 30 min |
| P5 — Domain | 30 min config + DNS wait |
| P6 — GitHub Actions | 30 min |
| **Total** | **~4 hours** |

## Cost

| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby | $0 |
| Render Web Service | Free | $0 (sleeps after 15 min idle) |
| Supabase Postgres | Free | $0 (500MB / 2GB egress) |
| GitHub Actions | Free tier | $0 (~300 min/mo usage, 2000 free) |
| Domain | already owned | — |
| **Total** | | **$0/mo** |

---

## Why not DigitalOcean

- **DO Droplet** = raw Ubuntu VM. You manage SSH, systemd, Caddy, TLS renewal, cron, log rotation, OS patches.
- **DO cost:** ~$27/mo (Droplet + Managed Postgres) vs $0 here.
- **DO setup:** 1–2 days vs 4 hours here.
- **DO failure recovery:** manual SSH + debug. Render/Vercel: containers auto-restart, atomic deploys.
- **What DO is actually better for:** long-running stateful services with custom OS deps. Not this project.
