# andWeYoga MVP — Admin features audit

> **Building admin backend? Start with [`ADMIN-BUILD-PLAN.md`](./ADMIN-BUILD-PLAN.md)** — recommended slices and current sprint (auth → catalog CRUD → bookings UI).

Internal reference for what the admin console can do today, what exists only on the API, and what is gated or not built. Use this before extending admin login, schedule management, and user operations.

| Field | Value |
|--------|--------|
| **Last updated** | 2026-05-14 |
| **Related docs** | `PRODUCT_BIBLE.md` §4, `awy.md`, `SOP-TESTING-AND-PRODUCTION.md` |
| **Admin URLs** | `/admin/login`, `/admin/dashboard` |

> **Privacy / security:** Do not commit real admin passwords. Default seeded credentials shown in the login UI are for development only — rotate and implement hashed passwords before production.

---

## Table of contents

1. [Access and authentication](#1-access-and-authentication)
2. [Enabled end-to-end (UI + API)](#2-enabled-end-to-end-ui--api)
3. [API enabled — no admin UI](#3-api-enabled--no-admin-ui)
4. [Public read APIs used by admin](#4-public-read-apis-used-by-admin)
5. [Gated, schema-only, or future](#5-gated-schema-only-or-future)
6. [CRUD matrix](#6-crud-matrix)
7. [File map](#7-file-map)
8. [Build goals vs current state](#8-build-goals-vs-current-state)
9. [Suggested build order](#9-suggested-build-order)
10. [Admin test checklist](#10-admin-test-checklist)

---

## 1. Access and authentication

| Item | Detail |
|------|--------|
| **Login URL** | `/admin/login` |
| **Dashboard URL** | `/admin/dashboard` (redirects to login if no admin session) |
| **Auth** | Separate from member auth: `adminToken` in `localStorage`, sent as `Authorization: Bearer <token>` |
| **Token** | JWT with claim `type: 'admin'`, **8-hour** expiry (`server/adminAuth.ts`) |
| **Member tokens** | Cannot call admin APIs (type check rejects user JWTs) |

### Security status (pre-production)

| Item | Status |
|------|--------|
| Admin password in database | **No `password` column** on `admin_users` |
| Password verification | Placeholder in `storage.verifyAdminCredentials` (hardcoded check — **must be replaced** with bcrypt + stored hash) |
| Default admin seed | Created on first DB init if no admin row exists (`storage.initializeData`) |
| Login page | Shows example credentials for dev — **remove or hide before live** |
| `admin` vs `super_admin` roles | Stored and displayed; **no route-level permission checks** |
| Admin session storage | `localStorage` only (member auth also supports httpOnly cookie) |
| Rate limiting | `POST /api/admin/auth/login` uses shared `authRateLimit` (10 attempts / 15 min per IP) |

---

## 2. Enabled end-to-end (UI + API)

### 2.1 Admin authentication

| Feature | API | UI |
|---------|-----|-----|
| Login | `POST /api/admin/auth/login` | `client/src/pages/admin-login.tsx` |
| Session verify | `GET /api/admin/auth/verify` | `client/src/components/admin-auth-provider.tsx` |
| Logout | Clears `adminToken` + React Query cache | Dashboard header |

### 2.2 Dashboard overview

| Metric | Source |
|--------|--------|
| Total users | `GET /api/admin/users` |
| Complete / incomplete profiles | Same endpoint (`shared/profileCompleteness` rules) |
| Sessions scheduled | `GET /api/classes` (count in UI) |

### 2.3 User management — view only

| Feature | API | UI |
|---------|-----|-----|
| List users + completeness | `GET /api/admin/users` | **Users** tab |
| Flags, completion %, icons | `storage.getUsersWithCompleteness()` | Per-user row |
| Refresh | — | Refresh button |

**Not available:** edit user, delete user, manual email verify, view full health text, export.

### 2.4 Class types — create + list

| Feature | API | UI |
|---------|-----|-----|
| List | `GET /api/class-types` (public) | **Class Types** tab |
| Create | `POST /api/class-types` (`requireAdminAuth`) | **New Class Type** modal |

Fields: name, description, price (INR), duration (minutes), optional image URL.

**Not available:** edit, delete.

### 2.5 Instructors — create + list

| Feature | API | UI |
|---------|-----|-----|
| List | `GET /api/instructors` (public) | **Instructors** tab |
| Create | `POST /api/instructors` (`requireAdminAuth`) | **New Instructor** modal |

Fields: name, bio, photo URL, comma-separated specialties.

**Not available:** edit, delete.

### 2.6 Schedule / sessions — create + list

| Feature | API | UI |
|---------|-----|-----|
| List sessions | `GET /api/classes` | **Sessions** tab |
| Create session | `POST /api/classes` (`requireAdminAuth`) | **New Session** modal |
| Public week schedule | `GET /api/schedule/week` | Marketing site (not admin calendar UI) |

Session fields (`classes` table): `classTypeId`, `instructorId`, `date`, `maxCapacity`, `currentBookings`, optional `googleMeetLink`, `razorpayLink`.

UI shows: past/full badges, booking count vs capacity, Meet and payment link links.

**Not available:** edit session, cancel session, change capacity after create, admin calendar view.

---

## 3. API enabled — no admin UI

Backend requires admin token; dashboard does **not** expose these yet.

| Feature | API | Notes |
|---------|-----|--------|
| All bookings | `GET /api/bookings` (`requireAdminAuth`) | No admin tab |
| Contact submissions | `GET /api/contact-messages` (`requireAdminAuth`) | No admin tab |
| Submit contact form | `POST /api/contact-messages` | Public site only |

`PRODUCT_BIBLE.md` §4.4 describes booking and contact review as admin capabilities — **API only today**.

---

## 4. Public read APIs used by admin

The dashboard loads lists via public GET endpoints (no admin header). **Writes** correctly require admin auth.

| Endpoint | Used for |
|----------|----------|
| `GET /api/class-types` | Class Types tab list |
| `GET /api/instructors` | Instructors tab list |
| `GET /api/classes` | Sessions tab list |

| Endpoint | Auth |
|----------|------|
| `POST /api/class-types` | Admin |
| `POST /api/instructors` | Admin |
| `POST /api/classes` | Admin |

---

## 5. Gated, schema-only, or future

### 5.1 Product / platform flags (not admin UI)

| Item | Status |
|------|--------|
| Health document object routes | `ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES = false` in `server/routes.ts` |
| Razorpay integration | Manual payment link on session only; no payment API |
| Google Meet automation | Manual link field only |
| SMS phone verify (profile) | UI removed; internal dev comments only |

### 5.2 Database tables — no admin API or UI

| Table | Intended purpose | Admin today |
|-------|------------------|-------------|
| `audit_logs` | Security / compliance trail | None |
| `user_documents` | Health file metadata | None |
| `user_session_mappings` | Attendance / session history | None |

**Note:** `GET /api/bookings/my` calls `storage.getUserBookings()` in routes, but that method is **not implemented** on `DatabaseStorage` — member session history may be broken separately from admin work.

### 5.3 Missing HTTP methods for catalog / schedule

There are **no** `PUT`, `PATCH`, or `DELETE` routes for:

- class types
- instructors
- classes (sessions)

Storage has `updateClassBookingCount` for booking flow only, not general class updates.

---

## 6. CRUD matrix

| Resource | Create | Read (admin) | Update | Delete |
|----------|--------|--------------|--------|--------|
| Class types | Yes (UI + API) | Yes (UI) | No | No |
| Instructors | Yes (UI + API) | Yes (UI) | No | No |
| Sessions / classes | Yes (UI + API) | Yes (UI) | No | No |
| Users | No | Yes (UI) | No | No |
| Bookings | User `POST /api/bookings` | API only | No | No |
| Contact messages | Public `POST` | API only | No | No |
| Admin users | Seed on init only | Login/verify | No | No |

---

## 7. File map

| Layer | Paths |
|-------|--------|
| Admin routes | `server/routes.ts` (~admin auth 838+, writes 498–613, bookings/contact 660–748) |
| Admin auth | `server/adminAuth.ts` |
| Storage / seed | `server/storage.ts` (`adminUsers`, `verifyAdminCredentials`, `getUsersWithCompleteness`) |
| Schema | `shared/schema.ts` |
| Admin UI | `client/src/pages/admin-login.tsx`, `client/src/pages/admin-dashboard.tsx` |
| Admin context | `client/src/components/admin-auth-provider.tsx` |
| App routes | `client/src/App.tsx` |
| Product spec | `PRODUCT_BIBLE.md` §4 |
| Security notes | `SECURITY_AUDIT.md` (Fix 3 — admin-protected writes) |

---

## 8. Build goals vs current state

| Goal | Today | Gap |
|------|--------|-----|
| Admin login | Works (dev password pattern) | Hash passwords; remove default creds from UI |
| Add class types | Create + list | Edit, delete |
| Add instructors | Create + list | Edit, delete |
| Manage schedule | Create + list sessions | Edit, cancel, richer calendar UX |
| Manage users | View + completeness | Edit, detail view, per-user bookings |
| Bookings / contact in admin | API only | Dashboard tabs |
| Production-ready admin security | Partial | Password column, RBAC optional |

---

## 9. Suggested build order

1. **Harden admin auth** — `password` hash on `admin_users`, remove hardcoded check and login-page defaults.
2. **Edit / delete APIs** — `PATCH`/`DELETE` for class types, instructors, classes + dashboard actions.
3. **Bookings tab** — `GET /api/bookings` with user + class enrichment.
4. **Contact messages tab** — `GET /api/contact-messages`.
5. **User detail** — read-only drawer (mobiles, health summary); respect privacy policy.
6. **Roles** — optional `super_admin`-only destructive actions.
7. **`audit_logs`** — write entries on admin mutations (table exists).
8. **Fix `getUserBookings`** — if member Session History is required.

---

## 10. Admin test checklist

Run on localhost or Railway after deploy.

- [ ] Open `https://<host>/admin/login` (or `http://localhost:3000/admin/login`)
- [ ] Login succeeds; redirected to `/admin/dashboard`
- [ ] **Users** tab loads; totals match complete/incomplete badges
- [ ] **Class Types** — create entry; visible on public “and We Teach” section
- [ ] **Instructors** — create entry
- [ ] **Sessions** — create session (requires class type + instructor); visible on `GET /api/schedule/week`
- [ ] Logout clears session; dashboard requires login again
- [ ] `POST /api/class-types` without `Authorization: Bearer <adminToken>` returns **401**
- [ ] `GET /api/bookings` without admin token returns **401** (API exists; UI not wired)

---

## Document maintenance

| When | Action |
|------|--------|
| New admin route or tab | Update §2–3 and §6 |
| Auth hardening shipped | Update §1 security table |
| RBAC added | Document role rules in §1 and §9 |

---

*End of admin features audit*
