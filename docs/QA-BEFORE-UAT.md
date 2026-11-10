# QA before user acceptance (mandatory)

No feature is **done** until automated checks pass and you sign off in the browser.

## Agent / developer checklist (every fix or feature)

1. **Unit tests** — `npm test`
2. **Sanity + regression** — `npm run test:sanity`
3. **Schema (when columns change)** — `npm run db:push`
4. **Epic smoke + clean slate** — `npm run qa:smoke-a01-e01` (auto-deletes `Smoke QA …` fixtures; see SOP §6.9)
5. **Fix bugs found** (including cross-pollination)
6. **Restart dev server** after API/route changes — `lsof -ti:3000 | xargs kill -9; npm run dev`
7. **Flag for UAT** — you test in browser; **no production commit** until you confirm

## Clean-slate rule

- Smoke and integration scripts **must** delete every row they create (`scripts/qa/purge-smoke-fixtures.ts`, `npm run db:purge-seed`).
- Use tagged names (`Smoke QA …`, `QA Fixture …`) — never hand-type production session names for tests.
- If you keep fixtures for browser inspection: `QA_SMOKE_SKIP_CLEANUP=1 npm run qa:smoke-a01-e01` → browser → `npm run qa:smoke-cleanup`.

## Test inventory (run 2026-05-21 — session create + QR)

| Suite | File | What it covers |
|-------|------|----------------|
| Sanity regression | `tests/sanity-regression.test.ts` | Shared schemas, admin bootstrap, booking flow, payment helpers, profile, QR + session validation |
| Payment QR | `tests/payment-qr.test.ts` | QR schema, JSON body limits, QR/Razorpay session rules, DB CRUD, `parseAdminApiError` |
| **Session validation** | `tests/admin-session-validation.test.ts` | All required fields, empty date, QR phone/email, publish later, client `validateSessionForm` |
| Admin auth | `tests/admin-auth.test.ts` | Bootstrap, bcrypt, credential normalization |
| Admin login integration | `tests/admin-login.integration.test.ts` | DB login (skips if no `DATABASE_URL`) |
| Booking flow | `tests/booking-flow.test.ts` | Member booking body, dropdown filters (incl. published visibility), pending booking |
| Flexi discovery | `tests/flexi-discovery.test.ts` | Eligibility summaries, flexibility sort, batch cap |
| Booking payment | `tests/booking-payment.test.ts` | Price format, payment URL validation |
| **Payment hold (A-01)** | `tests/booking-payment-hold.test.ts` | `initialBookingHeldUntil`, capacity, resume rules |
| **Epic smoke (A-01 + E-01)** | `scripts/qa/smoke-a01-e01.ts` | Live API: `heldUntil`, cancel-checkout, `strictNoTo`; auto cleanup |

**Last run:** `npm test` — see CI / local run for current count.

### Test fixture notes (keep suites green)

- **`filterBookableSessions`** — fixtures must include `status: "published"` (or live `scheduled` + `publishedAt` in the past). Draft, paused, and cancelled rows are excluded via `isClassVisibleForBooking` (`shared/class-visibility.ts`). See `tests/booking-flow.test.ts` `session()` helper.
- **Admin QR contact phone** — `adminPaymentQrCodeSchema` expects a **10-digit India number** (no `+91` prefix), e.g. `9876543210`. Same rule applies to `adminCreateInstructorSchema.phone` and session QR contact fields.
- **Booking flow time anchor** — `tests/booking-flow.test.ts` uses fixed `NOW = 2026-05-19`; `tests/sanity-regression.test.ts` uses `2026-06-01` for its date filter case. Do not replace these with `new Date()` or they will drift and fail.
- **Rolling week label** — `getRollingWeekDateRange` uses plain `"to"` between dates (no en/em dashes). See `tests/schedule-display.test.ts`.
- **Erasure 30-day copy** — pinned in `shared/consent.ts` and member-facing `client/src/pages/grievance.tsx` (not only Privacy Notice).
- **Admin session cancel** — `DeleteSessionDialog` + `handleDeleteSessionWithNotify` in `admin-dashboard.tsx` (legacy `performCancelSession` / `handleCancelSessionWithBookings` removed).
- **Test runner** — all suites use `node:test` + `node:assert/strict` (not Vitest). See `tests/session-terms.test.ts`.

## User acceptance — Create Session + QR (your turn)

- [ ] Admin → **New Session** — wide layout; Cancel + Schedule Session always visible at bottom
- [ ] Submit empty form → red summary + per-field errors (type, instructor, date, capacity, meet link, payment)
- [ ] **Razorpay** — missing link shows error; valid link saves
- [ ] **QR** — missing QR / phone / email shows errors; valid QR session saves
- [ ] **Publish later** — missing go-live time shows error
- [ ] Invalid phone (`12`) or email rejected before save
- [ ] QR upload still works (Payment QR tab)
- [ ] Reply **UAT OK** or describe failure → then production commit

## User acceptance — Checkout hold (A-01) + Not Suitable (E-01)

- [ ] Paid session: **Confirm & Reserve** → countdown chip visible before Pay
- [ ] Back / leave checkout → confirm dialog → spot released (toast)
- [ ] Session type with **Not Suitable** → tags on reserve, booking modal, dashboard card, We Workout
- [ ] **Send a message** opens SMS to support number; office hours match Mon–Sat 9:30–1:30 & 3:30–5:30 IST

## Commands

```bash
npm test
npm run test:sanity
npm run db:push
npm run qa:smoke-a01-e01
npm run qa:smoke-cleanup   # only after QA_SMOKE_SKIP_CLEANUP=1 run
```

Full SOP: [`SOP-TESTING-AND-PRODUCTION.md`](../SOP-TESTING-AND-PRODUCTION.md) §6.9
