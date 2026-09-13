# andWeProgress — Spec & Development Progress

| Field | Value |
|-------|-------|
| **Feature** | Admin / Super admin progress coaching view |
| **Tab** | `andWeProgress` on `/admin/dashboard` |
| **Status** | v1 shipped (admin accordion + APIs + section threads) |
| **Decided** | 11 Sep 2026 (product chat) |

---

## 1. In scope (v1)

| Area | Decision |
|------|----------|
| Audience | Admin + Super admin (`requireAdminAuth`) |
| Enrollments | **Active subscriptions only** (`status = active`, `programId` set) |
| Tree | Programs group → Program → User → Health updates & History \| Calorie statement |
| Multi-program user | Appear **under each** active program (same user-level health/fuel/notes) |
| Health detail | Current update + up to **5** archives; paginate one entry per page |
| Calorie detail | Fixed page size = **one calendar week** (Mon–Sun); prev/next week |
| Comments | **Threaded** comments on the **section** only (`health_history` \| `calorie_statement`) |
| Comment audit | Append-only create; **soft-edit** (`editedAt`) and **soft-delete** (`deletedAt`) |
| Instructor | Schema hooks only — nullable ack fields; **no instructor UI** |

---

## 2. Out of scope (do not lose — future backlog)

Track these explicitly so they are not forgotten:

| Item | Notes |
|------|--------|
| **Instructor UI / portal** for reading health or calorie progress | Phase 2+; instructor self-service still on hold globally |
| **Force instructor acknowledge** before logging onto a session | Product intent: ack health-section info before session join. Columns exist (`instructor_ack_required`, `acknowledged_at`, `acknowledged_by_instructor_id`). **Gate not implemented.** |
| **Comments on individual** health archives, meal lines, or week pages | Explicitly rejected — section-level only |
| **Inactive / expired / cancelled enrollments** | Not listed in the tree |
| **Program-scoped duplicate comment threads** | Threads are **user + section**, not per program (user may appear under multiple programs; same thread) |
| **Member-facing** andWeProgress surface | Admin-only in v1 |
| **SMS / push notify** instructors of new admin notes | Not built |
| **Standing summary note** separate from thread (hybrid Use case 3) | v1 is Use case 2 (full thread audit trail) only |

---

## 3. APIs (admin)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/progress/programs` | Programs with ≥1 active enrollment → users |
| GET | `/api/admin/progress/users/:userId/health?page=` | Current + archives, one entry per page |
| GET | `/api/admin/progress/users/:userId/fuel/statement?weekStart=` | Week-scoped calorie statement |
| GET | `/api/admin/progress/users/:userId/sections/:section/comments` | Section thread (non-deleted) |
| POST | `/api/admin/progress/users/:userId/sections/:section/comments` | Append comment |
| PATCH | `/api/admin/progress/comments/:id` | Soft-edit body |
| DELETE | `/api/admin/progress/comments/:id` | Soft-delete |

`section` ∈ `health_history` \| `calorie_statement`.

---

## 4. Schema

Table: `progress_section_comments`  
Patch: `scripts/db/patches/042-andwe-progress-section-comments.sql`

---

## 5. Development log

| Date | Change |
|------|--------|
| 11 Sep 2026 | v1: tab, accordion panel, APIs, soft-edit/delete threads, nullable instructor ack fields; out-of-scope recorded here + product decision log |
