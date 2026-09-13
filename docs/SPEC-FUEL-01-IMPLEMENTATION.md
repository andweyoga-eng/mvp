# andWeFuel (Calorie Bank) — Design Spec & Implementation

**Branch:** `cursor/webapp-redesign`  
**Commit:** `62edd6d` — `feat: add andWeFuel calorie bank with member dashboard and admin curation`  
**Source spec:** SPEC-FUEL-01 v0.5 (product doc) + `design_handoff_andwefuel_calorie_bank/` HTML prototype (not in repo; dashboard handoff lives under `design prototypes/design_handoff_dashboard/`)

---

## 1. Product summary

**andWeFuel** is a member-facing calorie-awareness tool (“Calorie Bank”) integrated into the member dashboard. It is **not** medical or nutritional advice.

| Area | Behavior |
|------|----------|
| Target & band | Per-user **daily calorie target** + **deficit tolerance** set by admin/coach |
| On-track band | `[target − deficit, target]` inclusive |
| Meal logging | Multiple meals per day; name + kcal stored (photos **never** persisted) |
| Day verdict | Shown only after **last meal slot** is logged (or day treated as closed for past days) |
| Time | Member **local** calendar date + wall time (`clientLocalDate`, `clientLocalTime`, IANA tz) |
| Consent | Reuses existing **`health_data`** consent (no separate `fuel_health` consent) |
| Curation | Admin publishes **daily recipe** + **practice-along video** (YouTube / Instagram embed) |
| Support | Off-ramp tel **+91 9513022331** (`FUEL_SUPPORT_TEL`) |

---

## 2. Confirmed product decisions (from spec workshop)

1. **Per-user admin-configured** target/deficit — not a global hardcoded floor for members.
2. **Safety rail:** effective floor `target − deficit` below **1200 kcal** requires admin **override reason** (`FUEL_SAFETY_FLOOR_CAL`).
3. **Consent:** extend `health_data` copy to cover WeFuel logs; withdraw health consent deletes/disables Fuel data.
4. **Launcher:** remove Trips/Explore from bottom nav; add **WeFuel** tab. Order: **WeFuel → WeBuild → WeEmo → andWeYOGa**.
5. **Multiple meals** allowed per day; slot inferred from local time bands unless member picks a slot.
6. **Statement** lives **in-tab** on `/fuel` (not under My Account).
7. **Recipe images (MVP):** admin **pastes absolute `https://` URL** (no upload pipeline).
8. **Pep phrases** from prototype copy are shipped (`FUEL_PEP_PHRASES`).
9. **Week chart** is live (last 7 days bars on dashboard).
10. **Age gate:** adults only (18+), same as platform.

---

## 3. Business rules (implementation)

Implemented in `shared/fuel.ts` and tested in `tests/fuel-business-rules.test.ts`.

### 3.1 Day status

```text
floor = target - deficit
if dayTotal > target  → "over"
if dayTotal < floor   → "under"
else                  → "on_track"
```

Before verdict is “ready”, status is **`pending`**.

### 3.2 Verdict timing

`shouldShowDayVerdict()` returns true when:

- Any logged meal’s `mealSlotIndex` equals the **last slot index** in the meal plan, **or**
- `dayClosed` is true (used for past days in week chart).

### 3.3 Default meal plan

| Index | Label | Start | End |
|-------|-------|-------|-----|
| 0 | Breakfast | 06:00 | 10:30 |
| 1 | Lunch | 11:30 | 15:00 |
| 2 | Snack | 15:00 | 18:00 |
| 3 | Dinner | 18:00 | 22:30 |

Admin can override per user via JSON meal plan.

### 3.4 Media URL normalization

- YouTube: watch, youtu.be, shorts, embed → embed id
- Instagram: `/p/`, `/reel/`, `/tv/` → embed id

---

## 4. Data model

**Patch:** `scripts/db/patches/037-andwefuel.sql`  
**Schema:** `shared/schema.ts`

### 4.1 `users` (Fuel columns)

| Column | Purpose |
|--------|---------|
| `daily_calorie_target_cal` | Target; `NULL` = not configured |
| `daily_deficit_cal` | Deficit band |
| `fuel_meal_plan` | JSON meal slots |
| `calorie_target_set_by` | Admin id |
| `calorie_target_set_at` | Timestamp |
| `fuel_floor_override_reason` | Required when floor < 1200 |

### 4.2 `fuel_meals` (ledger)

Stores: `user_id`, `logged_date` (YYYY-MM-DD), `logged_at`, `name`, `calories`, `target_at_log_cal`, `meal_slot_index`, `client_local_time`, `client_time_zone`.

**No photo column** — by design.

### 4.3 `fuel_recipes`

One row per `for_date` (unique): title, teaser, ingredients, method, `image_url`, `approx_kcal`.

### 4.4 `fuel_daily_media`

One row per `for_date`: `provider` (`youtube` | `instagram`), `embed_id`, `title`.

### 4.5 Erasure

On user erasure, `fuel_meals` rows are deleted in `storage.ts` (same transaction as other PII).

---

## 5. API surface

Registered in `server/routes.ts` via `registerFuelRoutes()` from `server/fuel-routes.ts`.

### 5.1 Member (requires `requireAuth`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/fuel/dashboard?localDate=&tz=` | Gated response (see §6) |
| GET | `/api/fuel/statement?localDate=&tz=` | Week statement; 403 without health consent |
| POST | `/api/fuel/meals` | Log meal (`fuelLogMealSchema`) |
| DELETE | `/api/fuel/meals/:id` | Own meals only |
| POST | `/api/fuel/estimate` | Photo in → advisory name/kcal out; **not stored** |

**Access gate** (`fuelAccessGate`):

1. User exists
2. Adult (`isAdult(dateOfBirth)`) → else `403 fuel_age_blocked`
3. `health_data` consent checked per endpoint

### 5.2 Admin (requires `requireAdminAuth`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/users/:id/fuel` | Read member Fuel config |
| PUT | `/api/admin/users/:id/fuel` | Set/clear config (`adminFuelConfigSchema`) |
| GET | `/api/admin/fuel/content?forDate=` | Recipe + media for date |
| PUT | `/api/admin/fuel/recipe` | Upsert recipe |
| PUT | `/api/admin/fuel/media` | Upsert daily video |

### 5.3 Dashboard response gates

```typescript
// client/src/lib/fuel-api.ts
gate: "health_consent_required" | "not_configured" | "ok"
```

- **`health_consent_required`:** still returns `recipe` + `practiceAlong` for inspiration cards.
- **`not_configured`:** consented but no target/deficit/plan.
- **`ok`:** full dashboard payload (target, weekBars, meals, pepPhrases, etc.).

---

## 6. Member UI

**Route:** `/fuel` (`client/src/pages/fuel.tsx`)  
**Shell:** `DashboardShell` with `active="fuel"`  
**Auth:** redirects to `/` if not logged in.

### 6.1 In-tab views

| View | Purpose |
|------|---------|
| **Fuel** | Hero, calories-left copy, week bars, today’s meals, recipe/video cards, log CTA |
| **Statement** | Week rollup, per-meal rows with day status/delta |

### 6.2 Log meal modal

1. Optional photo → `POST /api/fuel/estimate`
2. Member edits name + kcal (advisory label)
3. Optional meal slot override
4. `POST /api/fuel/meals` with client local date/time

### 6.3 Gate screens

- **Health consent:** CTA → `/my-account#privacy`
- **Not configured:** “Your coach has not set a target yet” + daily content still visible

### 6.4 Profile guard

`/fuel` is in `GUARDED_PREFIXES` (`use-profile-completion-guard.ts`) — incomplete profiles redirect to My Account.

---

## 7. Admin UI

**Users tab:** per-user **Fuel** button → `AdminFuelMemberDialog`  
(`client/src/components/admin/fuel-member-dialog.tsx`)

- Target, deficit, override reason, meal plan JSON
- Save / clear config

**WeFuel tab:** `AdminFuelContentPanel`  
(`client/src/components/admin/fuel-content-panel.tsx`)

- Pick date
- Recipe fields + image URL + approx kcal
- Video provider + URL/id + title

Consent log copy in admin mentions WeFuel under health data.

---

## 8. Launcher & navigation integration

`client/src/components/dashboard/dashboard-shell.tsx`:

```text
WeFuel      → /fuel
WeBuild     → /workshops
WeEmo       → /emojou
andWeYOGa   → /dashboard
```

- Grid: `grid-cols-4` (was 5).
- Trips/Explore routes still exist but are **not** in launcher (`active` type keeps legacy ids).
- `App.tsx` registers `<Route path="/fuel" component={FuelPage} />`.

---

## 9. Consent & privacy integration

| Integration point | Location |
|-------------------|----------|
| Consent type | `health_data` only (`shared/consent.ts`) |
| Copy updates | Health consent + withdraw banner mention WeFuel logs |
| Fuel API check | `storage.userHasActiveConsent(userId, "health_data")` |
| Withdraw / erasure | Fuel meals deleted with user; config columns cleared on admin clear |

**No separate Fuel consent checkbox** in onboarding.

---

## 10. Calorie estimation (photo)

`server/fuel-estimation.ts`

| Env | Behavior |
|-----|----------|
| `FUEL_ESTIMATION_ENABLED=true` + `GEMINI_API_KEY` | Gemini (`GEMINI_FUEL_MODEL`, default `gemini-2.0-flash`) |
| Otherwise | Manual fallback (empty name, 0 kcal; member enters values) |

Photos are base64 in request only; discarded after estimate response.

---

## 11. File map

| Layer | Files |
|-------|-------|
| Rules & Zod | `shared/fuel.ts` |
| DB | `shared/schema.ts`, `scripts/db/patches/037-andwefuel.sql` |
| API | `server/fuel-routes.ts`, `server/fuel-estimation.ts`, `server/storage.ts` |
| Member client | `client/src/pages/fuel.tsx`, `client/src/lib/fuel-api.ts` |
| Admin client | `client/src/components/admin/fuel-member-dialog.tsx`, `fuel-content-panel.tsx`, `admin-dashboard.tsx` |
| Nav | `client/src/components/dashboard/dashboard-shell.tsx`, `client/src/App.tsx` |
| Tests | `tests/fuel-business-rules.test.ts`, `tests/sessions-search.test.ts` (launcher) |

---

## 12. Setup & ops

```bash
npm run db:patch   # applies 037-andwefuel.sql once
npm run dev
```

Optional estimation:

```bash
FUEL_ESTIMATION_ENABLED=true
GEMINI_API_KEY=...
GEMINI_FUEL_MODEL=gemini-2.0-flash  # optional
```

---

## 13. Integration touchpoints (for modifications)

Use this section when planning changes:

| If you want to… | Touch |
|-----------------|-------|
| Change on-track math / verdict rules | `shared/fuel.ts`, `server/fuel-routes.ts`, tests |
| Add a new consent type | `shared/consent.ts`, onboarding UI, `fuelAccessGate`, copy |
| Link Fuel to Programs / Sessions | No link today — add in routes + UI; consider shared member context |
| Show Fuel on public home | Today member-only + auth; would need product decision on gating |
| Push targets from coach app / CRM | `PUT /api/admin/users/:id/fuel` or new bulk import |
| Replace Gemini | `server/fuel-estimation.ts` provider interface |
| Recipe image upload | Replace `optionalHttpUrl` in `adminFuelRecipeSchema` + admin panel |
| Notifications (meal reminders) | Not built; would need scheduler + meal plan times |
| My Account Statement tab | Currently **only** in `/fuel` Statement view |
| i18n for Fuel copy | Mostly inline in `fuel.tsx`; constants in `shared/fuel.ts` |
| Week start (Mon vs Sun) | `weekDateKeys()` in `fuel-routes.ts` (Monday-based) |

---

## 14. Out of scope / known gaps (MVP)

- No separate `fuel_health` consent artifact
- No photo storage or meal photo gallery
- No push/WhatsApp meal reminders
- No coach-facing mobile app; admin web only
- Estimation off by default in prod unless env enabled
- Member dashboard routes (`/workshops`, `/emojou`, etc.) still redirect unauthenticated users to `/`
- Explore page uses `DashboardShell` but is not in the 4-tab launcher

---

## 15. Test coverage

```bash
npm run test:sanity                    # includes tsc + regression
npx tsx --test tests/fuel-business-rules.test.ts
```

Covers: slot matching, day status bands, safety floor override, verdict timing, URL normalization, recipe/media validation.

---

## 16. Related platform context

- **Programs / SPEC-SESSIONS** work lives on `feature/spec-sessions-01-a2-c` — not merged with Fuel in that branch.
- Fuel is on **`cursor/webapp-redesign`** at `62edd6d`.
- Original implementation was stashed before sessions work; recovered from `stash@{0}` and committed.

---

*Generated from codebase state on `cursor/webapp-redesign` (Sep 2026). For HTML/visual reference, see original `design_handoff_andwefuel_calorie_bank/` prototype.*
