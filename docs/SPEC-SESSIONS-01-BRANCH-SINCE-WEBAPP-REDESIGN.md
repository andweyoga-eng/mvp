# SPEC-SESSIONS-01 — developments since `cursor/webapp-redesign`

| Field | Value |
|-------|-------|
| Branch | `feature/spec-sessions-01-a2-c` |
| Base | `cursor/webapp-redesign` (@ `55ac97f`) |
| Captured | 3 August 2026 |
| Commits on branch | `cdcce67`, `25f0b7d`, `b8a3f20` |
| Patches | `037`–`041` |

Authority: where this note and older drafts conflict, **SPEC-SESSIONS-01 v2.0 master + signed policies + `docs/SPEC-SESSIONS-01-MVP-SCOPE.md`** win.

---

## Commits

1. **cdcce67** — Programs stack A2–A5, FR-17, A1.1 allocation, purge prefix-only  
2. **25f0b7d** — FR-15 atomic Flexi composition; drop `flexi_selection_count`; Option B CA export  
3. **b8a3f20** — Part C: cancel→unscheduled, refund-to-source, clickwrap v2.0, member reschedule  

---

## Part A — Programs product

- Programs admin CRUD; checkout on `programs.price_paise`
- Composition any instructor / same class type; FR-17 collision
- FR-15 one-txn Flexi reserve; N = Program sessions/week
- FR-20 Sessions by Program; A1.1 `per_session_allocation` frozen at purchase

**Example:** 3×12 Program ₹10,000 → 36 sessions frozen; Flexi all-or-nothing across instructors.

---

## Part B — Ledger + Option B export

- `session_ledger` + consume-on-elapse sweeper
- Admin `GET /api/admin/accounting/subscriptions-export` (JSON/CSV)
- Recognised / deferred / refunded from allocation × counters

**Example:** 20/36 consumed → ₹5,555.56 recognised, ₹4,444.44 deferred (CA worked example).

---

## Part C — Cancel / reschedule / refund / clickwrap

- Clickwrap `cancellation-refund-v2.0` (effective 2026-08-03); page `/cancellation-refund`
- Admin cancel → unscheduled; guest full refund queue
- Member Reschedule on Cancelled; deadline → proportionate refund to source
- Razorpay refund initiate; complete on `refund.processed` webhook

**Example:** Platform cancels Wed → reschedule Thu or refund after MAX(cancel+30d, horizon_end).

---

## Ceased / retired

| Item | Replaced by |
|------|-------------|
| Credit wallet / “convert to credits” | Reschedule entitlement then refund to source |
| `classes.flexi_selection_count` | `programs.sessions_per_week` |
| Checkout from `class_types.price` | `programs.price_paise` |
| Partial Flexi composition | Atomic FR-15 reserve |
| Free-text cancel compensation | Ledger + refund |
| Voluntary reschedule (FR-54) | Out of MVP |
| Purge by live catalogue names | Prefix/QA fixtures only |

---

## Ops

```bash
npm run db:patch   # apply 037–041 as needed
npm run test:sanity
```

---

## Deferred (not on this branch)

GL-A in-app journals, GST credit-note split, drop `class_types.price` column, waitlist-on-release, FR-54.
