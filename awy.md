# awy — andWeYoga MVP change log and decisions

Internal tracking document for engineering and product. Update this file when you ship meaningful changes so the baseline stays explainable.

**Full testing & deploy SOP:** see [`SOP-TESTING-AND-PRODUCTION.md`](./SOP-TESTING-AND-PRODUCTION.md) (localhost → Railway → pre-live checklist).

**Admin console audit:** see [`ADMIN-FEATURES-AUDIT.md`](./ADMIN-FEATURES-AUDIT.md) (enabled vs API-only vs future).

**Admin build slices:** see [`ADMIN-BUILD-PLAN.md`](./ADMIN-BUILD-PLAN.md) (execution order; slice 1 = auth hardening).

**Deploy log convention:** Do **not** timestamp every git commit in this file. Only when a **working feature or fix is pushed/deployed** (tested and live or ready on Railway), add **one row** to **Deploy log** with: **UTC timestamp**, **short commit hash**, and the **same commit message** used for that push. Use **Session log** below for narrative context (what/why), not per-commit tables.

---

## Highlights (what matters most)

- **Profile completion is one rule everywhere.** Mandatory profile fields (verified email, name, valid primary and emergency mobiles, optional secondary if filled) plus health text (minimum length) must all pass before the account is “complete.” Order of filling Profile vs Health no longer matters for status, booking, or nav CTAs.
- **Server is source of truth for `profile_completion_status`.** Health-only saves no longer mark the profile complete. `/api/auth/me` reconciles stored status on read so older bad rows self-correct.
- **Booking is aligned with that rule.** `POST /api/bookings` returns 409 when the full account profile is incomplete, not only when health text is short.
- **Auth after login loads the full user** from `/api/auth/me` (cookie and optional Bearer) so the client always has mobiles, health fields, and completion status.
- **Health document uploads are off in product** until object storage and routes are ready; UI and server routes are gated behind a single flag. Users are directed to email for detailed reports where applicable.
- **SMS “verify phone” on Profile is removed from the UI** for now; numbers are still collected and format-validated. Rationale lives in **dev comments** (`client/src/pages/my-account.tsx`) and **`awy.md`** — not in user-facing copy.
- **Secrets stay out of git.** `.env` and common local variants are listed in `.gitignore`.
- **Railway Postgres:** App prefers **`DATABASE_PUBLIC_URL`** over **`DATABASE_URL`** when both exist, so the web service avoids **`ENOTFOUND postgres.railway.internal`** when private DNS does not resolve from the container.
- **Admin DB patches:** Use **`npm run db:patch`** for incremental SQL on existing DBs (avoids `drizzle-kit push` `42P16` on primary keys). Patches: `password_hash`, session link columns.
- **Admin bootstrap:** `ADMIN_INITIAL_PASSWORD` / `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_NAME` on the **webapp** service sync the primary admin on every boot. **Copy the same vars into local `.env`** for localhost — Railway variables are not read locally.
- **Admin dashboard (local):** Expanded UI — tabs for users, class types, instructors, sessions; create modals for catalog and sessions.

---

## Deploy log (timestamp + commit — only when pushed/deployed)

_Add a row when a feature or fix is deployed and working — not for every intermediate commit._

| Deployed (UTC) | Commit | Message |
|----------------|--------|---------|
| 2026-05-15 13:39 UTC | `4838b4c` | fix(admin): sync bootstrap credentials from env on boot |

---

## Session log (dated, newest first)

### 2026-05-15 — Admin bootstrap sync, db patches, admin dashboard UI

**Admin bootstrap (`server/storage.ts`)**

- **Problem:** Railway `ADMIN_INITIAL_*` vars do not apply on localhost; after legacy `admin123` login the DB hash did not match env password; wrong email vs `ADMIN_INITIAL_EMAIL` failed silently.
- **Fix:** `syncAdminFromEnv()` runs on every boot when `ADMIN_INITIAL_PASSWORD` is set (min 8 chars) — updates primary admin password hash and optional email/name. Login accepts env password if hash is stale; dev log hints when email does not match bootstrap email.
- **Ops:** Set vars on Railway **webapp** (not Postgres). Mirror into **local `.env`** and restart `npm run dev`. Look for `[DB] Admin bootstrap synced for …` in server logs.

**DB patches (`scripts/db/`, `npm run db:patch`)**

- Idempotent SQL patches for `admin_users.password_hash` and `classes.google_meet_link` / `razorpay_link`.
- Prefer over `npm run db:push` on existing Railway/local databases.

**Admin dashboard (`client/src/pages/admin-dashboard.tsx`)**

- Tabbed layout: overview stats, users, class types, instructors, sessions.
- Create flows for class types, instructors, and scheduled sessions (admin POST APIs).

**Docs:** `.env.example`, `ADMIN-BUILD-PLAN.md` updated for bootstrap and patch workflow.

---

### 2026-05-14 — Railway production, OAuth, and database connectivity

**Google OAuth on Railway vs custom domain**

- `ALLOWED_ORIGIN` in `server/routes.ts` drives `googleOauthRedirectUri()` (host for `redirect_uri`). Value must be **hostname only** — no `https://`, no path (e.g. `mvp-production-….up.railway.app` while testing on Railway; later `andweyoga.com` for live).
- If `ALLOWED_ORIGIN` is set to the production domain while testing on a Railway URL, Google redirects after login to the **wrong host**. Match `ALLOWED_ORIGIN` to the URL users actually open, and add the matching **Authorized JavaScript origins** and **Authorized redirect URIs** (`https://<host>/oauth2callback`) in Google Cloud Console.

**Database: `ENOTFOUND postgres.railway.internal`**

- Symptom: logs showed `getaddrinfo ENOTFOUND postgres.railway.internal` on DB calls; Google OAuth failed at callback with `Google OAuth callback error` because user lookup/create hits Postgres.
- Cause: **`DATABASE_URL`** from Railway often points at a **private** `*.railway.internal` host; in this deploy that name did not resolve from the web container.
- **Fix (shipped):** `server/db.ts` uses **`DATABASE_PUBLIC_URL` first**, then **`DATABASE_URL`**. `server/index.ts` startup accepts either variable. `drizzle.config.ts` uses the same preference for migrations.
- **Railway configuration:** On the **web** service, add **`DATABASE_PUBLIC_URL`** via **variable reference** from the **Postgres** service (Railway exposes this as the public TCP URL). Redeploy after changing variables. Keeping Postgres’s `DATABASE_URL` reference on the web service is fine; the app prefers public when set.
- Prefer the **full** connection string Railway shows for Postgres; do not arbitrarily strip query parameters (e.g. SSL-related) unless you understand the impact.

**Deploy to Railway**

- Connect repo and branch in Railway; **push** to GitHub (`git push origin <branch>`) triggers auto-deploy when enabled.
- After deploy, confirm **Variables** (`DATABASE_PUBLIC_URL`, `ALLOWED_ORIGIN`, `JWT_SECRET`, etc.) and check **Deployments → Logs**.

**Outcome:** Confirmed working in production after deploy and env updates.

---

## Detailed changes (by area)

### Railway and production database

- **`server/db.ts`:** Connection string = `DATABASE_PUBLIC_URL` || `DATABASE_URL`; production SSL keeps `rejectUnauthorized: false` for hosted Postgres.
- **`server/index.ts`:** Env validation requires `JWT_SECRET` and at least one of `DATABASE_URL` or `DATABASE_PUBLIC_URL`.
- **`drizzle.config.ts`:** Same URL resolution for Drizzle Kit / migrations.
- **`.env.example`:** Documents `DATABASE_PUBLIC_URL` for Railway.

### Environment and local dev

- Load env early (e.g. `dotenv` at server entry) so local runs behave predictably.
- Local database URL should use the **public** Postgres host, not internal-only Railway hostnames, when developing off the hosted network.
- Port and listen options adjusted for local compatibility (avoid platform-unsupported socket options where needed).

### Authentication
- **Input length discipline (project rule):** Any text input with a bounded business size must enforce limits in UI and server parsing. Prefer shared constants in `shared/input-limits.ts` and truncate on input via `limitTextInput(...)` before submit.


- **Google OAuth / cookie flow:** Local redirect uses **http** for localhost where appropriate; after redirect with `loginSuccess=true`, the client **refetches** the session user when there is no token in the URL.
- **Email login:** After successful login, **fetch full profile** from `/api/auth/me` instead of relying on a minimal JSON user payload, so completion and booking logic see real data.
- Logout clears cookie (and local token when used).

### Profile completion and booking (bug fix + product rule)

- **Shared module:** `shared/profileCompleteness.ts` — `isAccountProfileComplete`, `computeProfileCompletionStatus`, `getAccountProfileIncompleteReasons`, `MIN_HEALTH_UPDATE_CHARS`.
- **Shared mobile validation:** `shared/mobile-validation.ts`; client re-exports from `@/lib/mobile-validation` so client and server share the same digit and spam-pattern rules.
- **Server:** `PATCH /api/users/:id/health-update` sets completion from **merged** user + new health fields. `PUT /api/auth/profile` runs **`recomputeProfileCompletionStatus`** after update. **`GET /api/auth/me`** runs the same recompute before responding. **`POST /api/bookings`** blocks incomplete accounts with **409** and an updated message/redirect.
- **Storage:** `recomputeProfileCompletionStatus`; admin “users with completeness” uses the same full-account definition for `isComplete` and flags.
- **Client:** `client/src/lib/account-profile-complete.ts` wraps the shared check for auth `user`. **Navigation**, **classes-section**, **booking-modal** use it instead of health-only checks. **My Account** uses merged form state for “Complete Profile” vs “Update Profile” and shows **Profile status: Complete / Incomplete** from the same rule.

### Health updates and documents

- In-app **file upload UI removed** or disabled by product decision; help copy and toasts adjusted (e.g. health save toast title).
- **Server:** `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES` in `server/routes.ts` — when `false`, upload/object routes for health documents are not registered. When `true`, S3-compatible path can be used (`server/s3HealthStorage.ts`, `server/objectStorage.ts`, `.env.example` variables).
- Verbatim support email line for reports as specified by product (see `HealthUpdateSection` / related copy).

### Profile tab — SMS verification

- Per-number **Verify** buttons (mock SMS) **removed** from the Profile form.
- **Internal only:** full rationale in file header comments in `client/src/pages/my-account.tsx` and in **`awy.md`** under internal development notes — **not** shown as an alert to end users.

### Repository hygiene

- **`.gitignore`:** `.env`, `.env.local`, `.env.*.local` so secrets are not committed by mistake.

---

## Key decisions (short rationale)

| Topic | Decision | Rationale |
|--------|-----------|-----------|
| Profile “complete” | Single definition across DB, API, booking, and UI | Avoid contradictory UX (e.g. health saved → nav said complete while mobiles empty). |
| Reconcile on `/api/auth/me` | Yes | Fixes legacy rows where `profile_completion_status` was wrong without a one-off migration. |
| Health uploads | Off until flag + infra | Reduce local breakage and cost; product prefers email path until scale. |
| SMS verify on Profile | Off for now | Gatekeeping step deferred until product and SMS infra justify it; numbers still validated. |
| `.env` in git | Never | Security and environment-specific config. |
| Railway DB URL | Prefer `DATABASE_PUBLIC_URL` when Railway provides it | Private `*.railway.internal` in `DATABASE_URL` may not resolve from the app container; public TCP URL is reliable. |

---

## Platform roadmap (admin, mood, redirects) — 2026-05-15

### Shipped in codebase (run `npm run db:patch` for `003-platform-features.sql`)

| Area | Status | Notes |
|------|--------|--------|
| Admin form validation | **Fixed** | Shared `shared/admin-validation.ts`; price as string, date coercion; inline field errors + summary |
| Publish now / later | **MVP** | Session create modal; `classes.status`, `published_at` |
| Week grid (admin) | **MVP** | `WeekScheduleGrid` on Sessions tab with week number + date range |
| User activate/deactivate | **MVP** | `PATCH /api/admin/users/:id`; Deactivate = soft remove |
| Session attendance shadow | **MVP** | `session_join_events` + `users.session_attendance_count` on Meet link click API |
| Pre/post mood storage | **Schema + API** | `session_mood_checkins`, `POST /api/sessions/:classId/mood` |
| Post-session mood popup | **MVP UI** | Emoji dialog on schedule: `/?mood=post&classId=<id>#schedule` |

### Placeholder / next integration

| Area | Status | Approach |
|------|--------|----------|
| Bulk Excel user upload | **501 API** | `POST /api/admin/users/bulk` — needs xlsx parser + row validation + invite emails |
| Admin add user | **501 API** | Invite-by-email flow |
| Edit/delete catalog & pause UI | **Partial** | Pause/resume APIs exist; edit/delete buttons need Slice 2 PATCH/DELETE + UI |
| Instructor mood aggregate in Meet | **501 API** | `GET /api/admin/classes/:id/mood-summary` — query checkins + Meet add-on or side panel |
| Pre-session mood before Meet | **UI TBD** | Gate Meet link in schedule/booking with mood modal; call join + mood APIs |
| Google Meet auto-redirect after class | **Not in Meet API** | Use feedback URL in Meet description; Workspace custom leave URL; or manual return |
| Razorpay Payment Link redirect | **Config in Razorpay** | Set redirect URL per environment (below) |
| Payment webhook → booking | **Future** | Razorpay webhooks not wired in MVP |

### Redirect URLs (class schedule = `/#schedule`)

Replace `<host>` and `<classId>` with real values.

| Environment | After successful Razorpay payment | After session (post-mood feedback) |
|-------------|-----------------------------------|-------------------------------------|
| Localhost | `http://localhost:5000/#schedule` | `http://localhost:5000/?mood=post&classId=<classId>#schedule` |
| Railway MVP | `https://<your-railway-host>/#schedule` | `https://<your-railway-host>/?mood=post&classId=<classId>#schedule` |
| Production | `https://andweyoga.com/#schedule` | `https://andweyoga.com/?mood=post&classId=<classId>#schedule` |

**Razorpay:** In Payment Link / Payment Page settings, set **Redirect URL** to the payment column above (same for all links unless you use per-link overrides).

**Google Meet:** Standard Meet links do **not** redirect when a call ends. Options: (1) paste feedback URL in meeting description, (2) Google Workspace admin **leave URL** if available, (3) future Meet add-on. **We need from you:** Workspace admin access for leave URL, or accept manual “return to site” + email reminder.

**Pre-session mood (5.1):** Member flow should call `POST /api/sessions/:classId/mood` with `phase: "pre"` then open Meet; join also calls `POST /api/sessions/:classId/join`.

---

## Future work (backlog — not committed here)

- **SMS OTP verification:** Restore Profile UI and wire real SMS provider; enforce “verified” flags in schema/API if product requires it beyond format validation.
- **Health documents at scale:** Set `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES = true`, configure `OBJECT_STORAGE` / S3-compatible env, restore upload UX in `HealthUpdateSection` per comments in code.
- **Optional:** One-time SQL migration to backfill `profile_completion_status` from rules if you ever want to stop recomputing on every `/me` read (recompute is cheap but not mandatory forever).
- **Optional:** Expand login JSON to return full user again if you ever need login without a follow-up `/me` (current pattern is fetch after login).

---

## Primary files touched (reference)

| Area | Paths |
|------|--------|
| Completion rules | `shared/profileCompleteness.ts`, `shared/mobile-validation.ts` |
| API / booking | `server/routes.ts` |
| Persistence / admin completeness | `server/storage.ts` |
| Object storage | `server/objectStorage.ts`, `server/s3HealthStorage.ts`, `.env.example` |
| Auth client | `client/src/components/auth-provider.tsx`, `client/src/lib/auth.ts` |
| Profile / health UI | `client/src/pages/my-account.tsx`, `client/src/components/health-update-section.tsx` |
| Booking / nav | `client/src/components/navigation.tsx`, `client/src/components/classes-section.tsx`, `client/src/components/booking-modal.tsx` |
| Helpers | `client/src/lib/account-profile-complete.ts`, `client/src/lib/profile-constants.ts` |
| Internal docs | **`awy.md` (this file)**, `SOP-TESTING-AND-PRODUCTION.md` |
| Ignore secrets | `.gitignore` |
| DB / Drizzle | `server/db.ts`, `server/index.ts`, `drizzle.config.ts`, `.env.example` |
| Admin auth / bootstrap | `server/storage.ts`, `server/adminAuth.ts`, `client/src/pages/admin-login.tsx` |
| Admin dashboard | `client/src/pages/admin-dashboard.tsx` |
| DB patches | `scripts/db/apply-patches.ts`, `scripts/db/patches/*.sql`, `package.json` (`db:patch`) |

---

## How to use this file

1. When a feature or fix is **pushed/deployed and working**, add one row to **Deploy log** (UTC time, commit hash, commit message). Add or extend a **Session log** subsection for narrative (what/why). Update **Highlights** when user-visible or architectural. Skip `awy.md` updates for WIP or intermediate commits.
2. Move items from **Future work** into **Detailed changes** when shipped, and add new backlog items as they are agreed.
3. Keep user-facing marketing copy out of this file if you prefer; this is for **engineering and product alignment**.

_Last updated: 2026-05-15 — Admin bootstrap, db patches, admin dashboard; deploy log convention clarified._
