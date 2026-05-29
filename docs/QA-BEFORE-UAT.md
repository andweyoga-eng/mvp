# QA before user acceptance (mandatory)

No feature is **done** until automated checks pass and you sign off in the browser.

## Agent / developer checklist (every fix or feature)

1. **Unit tests** — `npm test`
2. **Sanity + regression** — `npm run test:sanity`
3. **Fix bugs found** (including cross-pollination)
4. **Restart dev server** after API/route changes — `lsof -ti:3000 | xargs kill -9; npm run dev`
5. **Flag for UAT** — you test in browser; **no production commit** until you confirm

## Test inventory (run 2026-05-21 — session create + QR)

| Suite | File | What it covers |
|-------|------|----------------|
| Sanity regression | `tests/sanity-regression.test.ts` | Shared schemas, admin bootstrap, booking flow, payment helpers, profile, QR + session validation |
| Payment QR | `tests/payment-qr.test.ts` | QR schema, JSON body limits, QR/Razorpay session rules, DB CRUD, `parseAdminApiError` |
| **Session validation** | `tests/admin-session-validation.test.ts` | All required fields, empty date, QR phone/email, publish later, client `validateSessionForm` |
| Admin auth | `tests/admin-auth.test.ts` | Bootstrap, bcrypt, credential normalization |
| Admin login integration | `tests/admin-login.integration.test.ts` | DB login (skips if no `DATABASE_URL`) |
| Booking flow | `tests/booking-flow.test.ts` | Member booking body, dropdown filters, pending booking |
| Booking payment | `tests/booking-payment.test.ts` | Price format, payment URL validation |

**Last run:** `npm test` — **74 passed**, 0 failed.

## User acceptance — Create Session + QR (your turn)

- [ ] Admin → **New Session** — wide layout; Cancel + Schedule Session always visible at bottom
- [ ] Submit empty form → red summary + per-field errors (type, instructor, date, capacity, meet link, payment)
- [ ] **Razorpay** — missing link shows error; valid link saves
- [ ] **QR** — missing QR / phone / email shows errors; valid QR session saves
- [ ] **Publish later** — missing go-live time shows error
- [ ] Invalid phone (`12`) or email rejected before save
- [ ] QR upload still works (Payment QR tab)
- [ ] Reply **UAT OK** or describe failure → then production commit

## Commands

```bash
npm test
npm run test:sanity
```
