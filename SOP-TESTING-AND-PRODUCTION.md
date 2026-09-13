# andWeYoga MVP — Testing & Production SOP

**Standard Operating Procedure** for local development, Railway staging/production testing, configuration, and pre-release sanity checks before end users use **andweyoga.com**.

| Field | Value |
|--------|--------|
| **Document version** | 1.0 |
| **Last updated** | 2026-05-14 |
| **Repository** | `github.com/andweyoga-eng/mvp` (branch: `awy-main` typical) |
| **Related docs** | `awy.md` (change log), `.env.example`, `PRODUCT_BIBLE.md` |

> **Privacy:** This document uses placeholders (`<…>`, `***`) for secrets, connection strings, and personal emails. Never paste real passwords, API keys, or full `DATABASE_URL` values into tickets or commits.

---

## Table of contents

1. [Purpose](#1-purpose)
2. [Architecture overview](#2-architecture-overview)
3. [Prerequisites](#3-prerequisites)
4. [Secrets and environment files](#4-secrets-and-environment-files)
5. [Local development setup](#5-local-development-setup)
6. [Local testing SOP](#6-local-testing-sop)
7. [Git workflow before deploy](#7-git-workflow-before-deploy)
8. [Railway setup](#8-railway-setup)
9. [Railway / staging URL testing SOP](#9-railway--staging-url-testing-sop)
10. [Google OAuth configuration matrix](#10-google-oauth-configuration-matrix)
11. [Profile completion & booking rules (test cases)](#11-profile-completion--booking-rules-test-cases)
12. [Pre-live release checklist (andweyoga.com)](#12-pre-live-release-checklist-andweyogacom)
13. [Troubleshooting](#13-troubleshooting)
14. [Sign-off template](#14-sign-off-template)

---

## 1. Purpose

Use this SOP to:

- Run and verify the app on **localhost** before pushing code.
- Deploy and verify on **Railway** (`https://<your-service>.up.railway.app`) before pointing **GoDaddy DNS** at production.
- Confirm **environment variables**, **database**, **OAuth**, and **profile/booking** behavior match product rules.
- Avoid repeating known failures (wrong `ALLOWED_ORIGIN`, `postgres.railway.internal` ENOTFOUND, health-only “complete” profile, OAuth without DB, cellular DNS quirks).

---

## 2. Architecture overview

| Layer | Technology |
|--------|------------|
| Frontend | React (Vite), served with Express in production |
| Backend | Express (`server/index.ts`, `server/routes.ts`) |
| Database | PostgreSQL (Drizzle ORM) |
| Auth | Email/password + Google OAuth; httpOnly cookie + optional Bearer token |
| Hosting (production path) | Railway (web + Postgres in same project) |
| DNS (live site) | GoDaddy → custom domain `andweyoga.com` (when ready) |

**Important:** `localhost` is only on your machine. Railway and `andweyoga.com` are separate targets; each needs its own `ALLOWED_ORIGIN` and Google OAuth entries while you test that URL.

---

## 3. Prerequisites

### Tools

- [ ] Node.js (LTS) and npm installed
- [ ] Git
- [ ] Access to GitHub repo `andweyoga-eng/mvp`
- [ ] Access to Railway project (web + Postgres services)
- [ ] Google Cloud Console — OAuth 2.0 Client (Web application)
- [ ] SendGrid (or configured email provider) for registration / reset emails
- [ ] PostgreSQL reachable from your laptop (**public** DB URL for local dev — not `*.railway.internal`)

### Accounts for testing

- [ ] Test email account (e.g. `<test-user>@gmail.com`) — **do not use production user PII in docs**
- [ ] Google account for “Sign in with Google” tests

---

## 4. Secrets and environment files

### 4.1 Files

| File | Commit to git? | Purpose |
|------|----------------|---------|
| `.env` | **Never** | Local secrets (listed in `.gitignore`) |
| `.env.example` | Yes | Template only — placeholders |
| Railway Variables | N/A | Production/staging secrets on host |

### 4.2 Required variables (reference)

Copy `.env.example` → `.env` locally. On Railway, set the same keys in the **web** service (values differ per environment).

| Variable | Local typical value | Railway / production notes |
|----------|---------------------|----------------------------|
| `DATABASE_URL` | Public Postgres URL from provider | Often private `*.railway.internal` — app may not resolve it |
| `DATABASE_PUBLIC_URL` | Optional locally | **Recommended on Railway web service** — reference from Postgres service; app prefers this when set (`server/db.ts`) |
| `JWT_SECRET` | Random string ≥ 32 chars | **Unique per environment**; never reuse dev secret in prod |
| `ALLOWED_ORIGIN` | `localhost:3000` (hostname only, no `https://`) | Match URL users open: `<service>.up.railway.app` OR `andweyoga.com` |
| `NODE_ENV` | `development` | `production` on Railway |
| `GOOGLE_CLIENT_ID` | From Google Console | Same client can list multiple redirect URIs |
| `GOOGLE_CLIENT_SECRET` | From Google Console | *** store only in env *** |
| `SENDGRID_API_KEY` | From SendGrid | Required for email verification / reset flows |

Optional (health document uploads — **currently disabled in product**):

- `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES` is a **code flag** in `server/routes.ts` (default `false`), not an env var.
- S3 object storage vars — see `.env.example` when uploads are re-enabled.

### 4.3 `ALLOWED_ORIGIN` rules (critical)

- Value = **hostname only** (no `https://`, no path, no trailing slash).
- Examples:
  - Local: `localhost:3000`
  - Railway: `<your-service>.up.railway.app`
  - Live: `andweyoga.com` or `www.andweyoga.com` (pick one canonical host)
- Used for: Google OAuth `redirect_uri`, CORS, some email link hosts.
- **Mismatch symptom:** OAuth redirects to wrong host; login “works” on one URL but not another.

### 4.4 Privacy checklist for env

- [ ] `.env` is in `.gitignore`
- [ ] `git status` never shows `.env` staged
- [ ] Railway variables are not exported to screenshots/slack
- [ ] `DATABASE_URL` in logs is never printed in full

---

## 5. Local development setup

### 5.1 Clone and install

```bash
cd /path/to/mvp
npm install
```

### 5.2 Configure `.env`

1. `cp .env.example .env`
2. Fill placeholders (see §4.2).
3. **Database:** Use the **public** connection string from Neon/Railway/Postgres provider.  
   - **Wrong:** host contains `postgres.railway.internal` on your laptop → `ENOTFOUND`.
   - **Right:** host like `*.railway.app`, `*.neon.tech`, or `localhost`.

### 5.3 Database schema

```bash
npm run db:push
```

Run when schema changes (`shared/schema.ts`).

### 5.4 Start dev server

```bash
npm run dev
```

Default: **http://localhost:3000** (confirm `PORT` in `.env` if set).

### 5.5 Local Google OAuth

In Google Cloud Console → OAuth client → add for **local**:

| Type | Value |
|------|--------|
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `http://localhost:3000/oauth2callback` |

Set in `.env`:

```env
ALLOWED_ORIGIN=localhost:3000
NODE_ENV=development
```

Server uses **http** for localhost in `googleOauthRedirectUri()` (`server/routes.ts`).

---

## 6. Local testing SOP

Work through in order. Check each box before pushing to GitHub.

### 6.1 Smoke

- [ ] App loads at `http://localhost:3000` without console errors
- [ ] `GET /api/class-types` returns data (or empty array, not 500)
- [ ] Schedule/week endpoint loads
- [ ] Server log: `Environment validation passed` (no missing `JWT_SECRET` / DB vars)
- [ ] **Schema push:** `npm run db:push` (applies migrations + purges demo seed — see §6.9)
- [ ] **Epic smoke (A-01 hold + E-01 strictNoTo):** `npm run qa:smoke-a01-e01` — must end with *slate clean*

### 6.2 Email / password auth

- [ ] Register new user (test email)
- [ ] Verification email received (or verify flow documented if SendGrid sandbox)
- [ ] Login with verified account
- [ ] After login, session has full user (name, mobiles, health fields) — auth provider calls `/api/auth/me`
- [ ] Logout clears session

### 6.3 Google OAuth (local)

- [ ] “Sign in with Google” → Google consent → returns to `http://localhost:3000/?loginSuccess=true`
- [ ] User is logged in (avatar/menu shows account)
- [ ] Railway/production: N/A — use local redirect URI only

### 6.4 My Account — Profile tab

- [ ] Name, primary mobile, emergency mobile required; secondary optional
- [ ] Invalid mobile shows validation errors (10 digits, spam patterns)
- [ ] **SMS “Verify” buttons are not shown** (intentionally disabled — see `my-account.tsx` dev comments / `awy.md`)
- [ ] **Profile status** shows **Incomplete** until all mandatory fields + health + verified email
- [ ] Button label: **Complete Profile** vs **Update Profile** matches completion state

### 6.5 My Account — Health tab

- [ ] Health text minimum length enforced (10 characters — `MIN_HEALTH_UPDATE_CHARS`)
- [ ] Save shows toast **“Health update saved”** (title only)
- [ ] Health document upload UI **disabled**; email line for reports present per product copy
- [ ] After save, `refreshUser` updates nav/booking state

### 6.6 Profile completion order (regression)

| Step | Action | Expected |
|------|--------|----------|
| A | Save health only (valid text), leave mobiles empty | Profile **Incomplete**; nav shows **Complete Profile** |
| B | Fill mobiles + name, save profile | Still **Incomplete** if health short or email unverified |
| C | Complete all mandatory fields + verified email | **Complete**; **Book Session** / booking allowed |

### 6.7 Booking

- [ ] Logged out: booking prompts sign-in
- [ ] Incomplete profile: toast + redirect to `/my-account`; no booking created
- [ ] Complete profile: booking flow proceeds (or 409 from API if server disagrees — investigate)

### 6.8 Typecheck (optional before commit)

```bash
npm run check
```

### 6.9 Clean-slate testing (mandatory for agents & QA)

**Rule:** Any script or manual test that creates DB rows must remove them before you sign off. Tagged fixtures use the `Smoke QA …` prefix (`shared/seed-catalog.ts`).

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `npm run db:push` | Apply schema; auto-run `db:purge-seed` unless `SKIP_SEED_PURGE=1` |
| 2 | `npm run dev` | Local server for API + browser |
| 3 | `npm run qa:smoke-a01-e01` | API smoke: payment hold (`heldUntil`), cancel-checkout, `strictNoTo` |
| 4 | Browser (optional) | Use URLs printed by step 3; or home → booking modal, admin Session Types |
| 5 | `npm run qa:smoke-cleanup` | Only if step 3 was run with `QA_SMOKE_SKIP_CLEANUP=1` |
| 6 | `npm run db:purge-seed` | Nuclear option: all seed + QA fixture prefixes |

**Browser-only pass with fixtures kept briefly:**

```bash
QA_SMOKE_SKIP_CLEANUP=1 npm run qa:smoke-a01-e01
# … manual browser checks …
npm run qa:smoke-cleanup
```

**Never leave behind:** guest bookings from smoke runs, `Smoke QA …` session types/instructors, or `@example.com` QA emails from ad-hoc scripts. Deprecated `scripts/qa-p1-api-pass.ts` does not clean up — do not use for new work.

---

## 7. Git workflow before deploy

### 7.1 Pre-commit

```bash
git status
```

- [ ] `.env` **not** listed
- [ ] Only intended files changed
- [ ] `awy.md` updated if behavior/architecture changed

### 7.2 Commit and push

```bash
git add -A
git status   # confirm .env still absent
git commit -m "<clear message>"
git push origin awy-main
```

Use your team’s branch name if not `awy-main`.

### 7.3 After push

- [ ] Railway auto-deploy triggered (if connected)
- [ ] Deployment status **Success** in Railway dashboard

---

## 8. Railway setup

### 8.1 Project structure

In **one Railway project**:

| Service | Role |
|---------|------|
| **Web** | Node app (`npm run build` / `npm start`) |
| **PostgreSQL** | Database |

### 8.2 Web service — build & start

Confirm Railway settings match repo scripts:

| Phase | Command |
|--------|---------|
| Build | `npm run build` |
| Start | `npm run start` → `NODE_ENV=production node dist/index.js` |

Listen port: Railway sets `PORT` (often **8080**). App should bind to `process.env.PORT`.

### 8.3 Web service — variables (minimum)

Set via **Variables** or **reference from Postgres service**:

| Variable | How to set |
|----------|------------|
| `JWT_SECRET` | Generate new secret ≥ 32 chars — *** not same as local *** |
| `DATABASE_URL` | Reference from Postgres (optional if public used) |
| `DATABASE_PUBLIC_URL` | **Reference from Postgres** — **required fix** for `ENOTFOUND postgres.railway.internal` |
| `ALLOWED_ORIGIN` | `<your-service>.up.railway.app` (hostname only) while testing Railway URL |
| `NODE_ENV` | `production` |
| `GOOGLE_CLIENT_ID` | Same or separate OAuth client |
| `GOOGLE_CLIENT_SECRET` | *** secret *** |
| `SENDGRID_API_KEY` | Production or sandbox key |

**Do not** manually add `sslmode=no-verify` unless Postgres URL already includes it; prefer **exact** strings from Postgres service.

### 8.4 Postgres service

- [ ] Service **Running**
- [ ] Web service has variable **references** (not stale copy-paste from old project)

### 8.5 Public URL

Railway → Web → **Settings → Networking** → copy **public domain** (e.g. `https://<your-service>.up.railway.app`).

Use this URL for testing until GoDaddy points to production.

### 8.6 Deploy from GitHub

1. Connect repo `andweyoga-eng/mvp`, branch `awy-main`.
2. Push to GitHub → wait for deploy **Success**.
3. Open **Deployments → Logs**:
   - [ ] `Environment validation passed`
   - [ ] `andWeYoga server running on port …`
   - [ ] **No** repeating `ENOTFOUND postgres.railway.internal`

---

## 9. Railway / staging URL testing SOP

Repeat §6 tests on:

`https://<your-service>.up.railway.app`

### 9.1 Environment-specific checks

- [ ] `ALLOWED_ORIGIN` = `<your-service>.up.railway.app` (not `andweyoga.com` during Railway-only testing)
- [ ] Google Console includes this host’s OAuth entries (§10)
- [ ] `DATABASE_PUBLIC_URL` set on web service
- [ ] HTTPS works (Railway TLS)

### 9.2 Google OAuth on Railway

- [ ] Sign in with Google completes without `/?error=google_auth_failed`
- [ ] Logs: no `Google OAuth callback error` + DB errors
- [ ] Cookie session works (refresh page still logged in)

### 9.3 Mobile testing

- [ ] Works on **Wi‑Fi**
- [ ] Test on **cellular** (some carriers fail DNS for `*.up.railway.app` with `DNS_PROBE_FINISHED_NXDOMAIN`)
  - If cellular fails but Wi‑Fi works: carrier/phone DNS issue, not app code
  - Mitigations: custom domain `andweyoga.com`, or phone DNS 1.1.1.1 / disable Private Relay
- [ ] Test iOS Safari and one Android browser if possible

### 9.4 Before switching to andweyoga.com

- [ ] All §6 functional tests pass on Railway URL
- [ ] Document current Railway hostname in team runbook (placeholder only in shared docs)

---

## 10. Google OAuth configuration matrix

Use **one OAuth Web client** with **multiple** origins/redirects, or separate clients per environment.

Replace `<host>` with actual hostname **only** (no scheme).

| Environment | JavaScript origins | Redirect URI |
|-------------|-------------------|--------------|
| Local | `http://localhost:3000` | `http://localhost:3000/oauth2callback` |
| Railway staging | `https://<your-service>.up.railway.app` | `https://<your-service>.up.railway.app/oauth2callback` |
| Production | `https://andweyoga.com` | `https://andweyoga.com/oauth2callback` |
| Production (www) | `https://www.andweyoga.com` | `https://www.andweyoga.com/oauth2callback` |

**Rules:**

- `redirect_uri` sent by server = `https://<ALLOWED_ORIGIN>/oauth2callback` (or `http` for localhost).
- Must match Google Console **exactly** (scheme, host, path).
- When testing Railway, **do not** set `ALLOWED_ORIGIN=andweyoga.com` unless users actually open the site on that domain.

**OAuth flow (reference):**

1. User hits `GET /api/auth/google`
2. Redirect to Google
3. Google → `GET /oauth2callback?code=…`
4. Server exchanges code, sets httpOnly cookie, redirects `/?loginSuccess=true`
5. Client `AuthProvider` calls `/api/auth/me`

---

## 11. Profile completion & booking rules (test cases)

**Single rule** (`shared/profileCompleteness.ts`): account is complete only when **all** of:

- [ ] Email verified
- [ ] Name non-empty
- [ ] Primary mobile present and valid (10 digits, validation rules)
- [ ] Emergency mobile present and valid
- [ ] Secondary mobile valid **if** provided
- [ ] Health update text ≥ 10 characters (trimmed)

**Enforced in:**

- DB field `profile_completion_status` (recomputed on profile save, health PATCH, `/api/auth/me`)
- Nav / classes / booking modal (`account-profile-complete.ts`)
- `POST /api/bookings` → **409** if incomplete

**SMS phone verification:** Not required (UI removed); documented internally only.

---

## 12. Pre-live release checklist (andweyoga.com)

Complete before marketing the site to end users.

### 12.1 DNS (GoDaddy)

- [ ] Add custom domain in Railway → Networking
- [ ] GoDaddy DNS records match Railway instructions (CNAME / ALIAS as provided)
- [ ] `https://andweyoga.com` loads app
- [ ] Decide canonical host: apex vs `www` → redirect the other

### 12.2 Production env

- [ ] `ALLOWED_ORIGIN=andweyoga.com` (or `www.andweyoga.com` — match canonical)
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` strong and unique
- [ ] `DATABASE_PUBLIC_URL` and/or `DATABASE_URL` referenced from production Postgres
- [ ] All secrets rotated from staging if staging was shared

### 12.3 Google OAuth (production)

- [ ] Production origins + redirect URIs added (§10)
- [ ] Test full Google login on **production domain**
- [ ] Remove staging Railway URIs from Google client **only if** you no longer need Railway staging

### 12.4 Email

- [ ] SendGrid (or provider) domain authenticated for `@andweyoga.com` if applicable
- [ ] Verification and password-reset links use production host

### 12.5 Security & compliance

- [ ] `.env` never committed
- [ ] Rate limits on auth endpoints active (`server/routes.ts`)
- [ ] Health document upload routes remain gated unless product enables (`ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES`)
- [ ] Review `SECURITY_AUDIT.md` open items

### 12.6 End-to-end on production domain

Repeat §6 and §9.2 on `https://andweyoga.com` with real-device cellular test.

### 12.7 Documentation

- [ ] Update `awy.md` session log with release date
- [ ] Team knows Railway dashboard URL and on-call for deploy failures

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `ENOTFOUND postgres.railway.internal` | Web service using private DB host that doesn’t resolve | Set `DATABASE_PUBLIC_URL` on web service (reference from Postgres); redeploy; code prefers public URL in `server/db.ts` |
| `Google OAuth callback error` + DB errors in log | Same as above — callback needs DB for user create/lookup | Fix database connectivity first |
| OAuth redirects to wrong site | `ALLOWED_ORIGIN` doesn’t match browser URL | Set hostname to URL users actually use |
| `redirect_uri_mismatch` (Google) | Console URI ≠ server `redirect_uri` | Add exact `https://<host>/oauth2callback` to Google Console |
| Login works on Wi‑Fi, `DNS_PROBE_FINISHED_NXDOMAIN` on cellular | Mobile carrier DNS | Custom domain; phone DNS 1.1.1.1; disable Private Relay / Private DNS |
| Profile “complete” but mobiles empty | Old bug — health-only completion | Ensure latest code + `/api/auth/me` reconcile; see `awy.md` |
| `Environment validation passed` but empty classes | DB empty or seed not run | Run `db:push` / seed data in target DB |
| Port error locally (`EADDRINUSE`) | Another process on 3000 | Change `PORT` or stop other process |
| Local DB `ENOTFOUND` for railway.internal | Copied Railway **internal** URL to local `.env` | Use **public** Postgres URL for local dev |

**Log phrases to search in Railway:**

- `Google OAuth callback error`
- `ENOTFOUND postgres.railway.internal`
- `Environment validation passed`
- `FATAL: Missing required environment variables`

---

## 14. Sign-off template

Copy for each release:

```
Release: v________  Date: __________  Tester: __________

[ ] Local §6 complete
[ ] Railway URL §9 complete
[ ] Google OAuth (Railway URL): __________
[ ] Profile completion scenarios §11: __________
[ ] Mobile Wi‑Fi: __________  Mobile cellular: __________
[ ] Production domain (if applicable): __________

Notes:
_________________________________________________
_________________________________________________

Approved for production traffic: YES / NO  Signature: __________
```

---

## Document maintenance

| When | Action |
|------|--------|
| New env var added | Update §4.2 and `.env.example` |
| OAuth or hosting change | Update §10 and §12 |
| New product gate (e.g. SMS verify) | Update §6, §11, `awy.md` |
| Incident fixed | Add row to §13 and dated note in `awy.md` |

**Export to Word:** Open this `.md` in Microsoft Word, Google Docs, or run `pandoc SOP-TESTING-AND-PRODUCTION.md -o SOP-TESTING-AND-PRODUCTION.docx` if Pandoc is installed.

---

*End of SOP*
