# Admin backend — build plan (slices)

**Status:** In progress · **Start here** before opening individual PRs.

This is the execution order for admin backend work. Each slice should be deployable and testable on its own. Details of what exists today are in [`ADMIN-FEATURES-AUDIT.md`](./ADMIN-FEATURES-AUDIT.md).

---

## Recommended slices (build in this order)

| Slice | Name | Why first | Deliverables |
|-------|------|-----------|--------------|
| **1** | **Admin auth hardening** | Everything else depends on safe login | `password_hash` on `admin_users`, bcrypt verify, env-based bootstrap, remove hardcoded creds from UI |
| **2** | **Catalog CRUD APIs** | You already have create; edit/delete unblock ops | `PATCH` + `DELETE` for class types, instructors, sessions (`/api/classes`) |
| **3** | **Admin dashboard — catalog CRUD UI** | Wire slice 2 in UI | Edit/delete modals on Class Types, Instructors, Sessions tabs |
| **4** | **Bookings admin API + UI** | API exists but no UI | Enriched `GET /api/admin/bookings` (optional) or enrich existing `GET /api/bookings`; Bookings tab |
| **5** | **Contact messages tab** | API exists but no UI | `GET /api/contact-messages` already; list + mark-read later |
| **6** | **User admin (read → limited write)** | Support without risky deletes first | User detail drawer; optional manual `emailVerified` / notes |
| **7** | **Audit log writes** | Compliance when admins change data | Insert `audit_logs` on admin mutations |
| **8** | **RBAC (optional)** | Only if multiple admin roles matter | Enforce `super_admin` on delete / admin-user management |

**Defer (product backlog, not blocking admin MVP):**

- Razorpay payment API (manual link on session is enough for now)
- Google Meet automation
- `user_session_mappings` / attendance UI
- `user_documents` admin viewer (uploads gated off)
- Admin httpOnly cookie (nice-to-have; Bearer + localStorage works)

---

## Slice 1 — Admin auth hardening (current)

### Goals

- [x] Store bcrypt password hash on `admin_users`
- [x] Verify with `verifyPassword` (same as members)
- [x] Seed first admin with hash from `ADMIN_INITIAL_PASSWORD` env (no default in UI)
- [x] One-time legacy migration: existing row without hash + old password → rehash on successful login
- [x] Remove plaintext default credentials from login page

### Env (Railway / `.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `ADMIN_INITIAL_PASSWORD` | Strongly recommended on first deploy | Password for **new** seeded admin only (when no admin row exists) |
| `JWT_SECRET` | Yes | Already required; admin tokens use same secret with `type: admin` |

### After deploy

**Preferred** (avoids `drizzle-kit push` error `42P16 column "id" is in a primary key` on existing DBs):

```bash
npm run db:patch
```

This applies SQL in `scripts/db/patches/` (e.g. `password_hash`, session link columns).

`npm run db:push` may still fail on databases created before schema drift was resolved; use `db:patch` for incremental column adds.

Set `ADMIN_INITIAL_PASSWORD` before first boot in a fresh DB, or reset hash via DB for existing admins.

---

## Slice 2 — Catalog CRUD APIs (next)

### Endpoints to add

| Method | Path | Auth |
|--------|------|------|
| `PATCH` | `/api/class-types/:id` | `requireAdminAuth` |
| `DELETE` | `/api/class-types/:id` | `requireAdminAuth` |
| `PATCH` | `/api/instructors/:id` | `requireAdminAuth` |
| `DELETE` | `/api/instructors/:id` | `requireAdminAuth` |
| `PATCH` | `/api/classes/:id` | `requireAdminAuth` |
| `DELETE` | `/api/classes/:id` | `requireAdminAuth` |

### Rules

- Delete session: block if `currentBookings > 0` (or soft-cancel — product call)
- Delete class type / instructor: block if referenced by future sessions (FK / check)
- `PATCH` classes: allow `date`, `maxCapacity`, `googleMeetLink`, `razorpayLink`, `instructorId`, `classTypeId`

### Storage methods to add

`updateClassType`, `deleteClassType`, `updateInstructor`, `deleteInstructor`, `updateClass`, `deleteClass`

---

## Slice 3 — Dashboard CRUD UI (after slice 2)

- Edit + Delete on each card in Class Types / Instructors / Sessions
- Confirm dialog on delete
- Toast + refetch pattern (same as create modals)

---

## Slice 4 — Bookings tab

- `GET /api/bookings` with joins: user name/email, class type, instructor, session date
- Table: user, class, session time, booked at
- Optional filter by date range

---

## Slice 5 — Contact messages tab

- List from `GET /api/contact-messages`
- Sort newest first

---

## Testing gate (each slice)

See [`SOP-TESTING-AND-PRODUCTION.md`](./SOP-TESTING-AND-PRODUCTION.md) plus admin section in [`ADMIN-FEATURES-AUDIT.md`](./ADMIN-FEATURES-AUDIT.md) §10.

---

## Progress log

| Date | Slice | Notes |
|------|-------|-------|
| 2026-05-14 | 1 | Auth hardening started — schema + storage + login UI |

---

*Update the progress log and checkboxes as slices ship.*
