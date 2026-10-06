# SPEC-SESSIONS-01 — MVP scope & product decisions

| Field | Value |
|-------|-------|
| **Spec** | SPEC-SESSIONS-01 v2.0 CONSOLIDATED MASTER (+ Cancellation Policy v2.0, CA Accounting Policy) |
| **Logged** | 3 August 2026 |
| **Decided by** | Product (Mudz / Arun) with engineering |
| **Purpose** | Program Manager tracker: what is **in MVP**, what is **deferred**, and the build sequence |

Authority: where this note and older chat/spec drafts conflict, **this note + v2.0 master + signed policies** win.

---

## 1. Locked product decisions (3 Aug 2026)

| # | Topic | Decision | MVP? |
|---|--------|----------|------|
| 1 | Composition & reschedule pool | Slots from **any instructor**, same **class type**. Reschedule also any instructor. | Yes |
| 2 | A1.1 `per_session_allocation` | Ship **now**. `NUMERIC(18,8)` = `total_paid_paise / 100 / sessions_purchased`, frozen at checkout (post-coupon). | Yes |
| 3 | Revenue / GL | **Option B for MVP**: entitlement ledger + frozen allocation; **export** amounts for CA to post in their books. No full in-app double-entry GL in MVP. | B = MVP; A = future |
| 4 | `sessions_credited` / `credited` | **Keep** the name. Use only for **refunded / lapsed** entitlement after reschedule deadline — **not** a credit wallet. | Yes |
| 5 | Ship order | Commit **A2–A5 + FR-17** first → **A1.1** → deepen Part B (export-oriented) → **Part C + clickwrap**. | Yes |
| 6 | Cancellation Policy v2.0 | **Signed off.** Grievance Officer = Mudit (details filled). **Policy live / effective date = 3 August 2026.** Clickwrap at checkout; archive old versions; store timestamp + version per booking. | Yes |
| 7 | Purge safety (D9/D10) | **Safer end state**: identify fixtures by **prefix** / reserved QA names only — **not** by live catalogue names (`Hatha Yoga`, etc.). Guard B retained. | Yes |
| 8 | `flexi_selection_count` | Drop in **same A4 cleanup** (sessions/week lives on Program). | Yes |
| 9 | FR-15 | Full composition reserve in **one transaction**; no partial seats. | Yes |
| 10 | Sessions tab | **FR-20 must**: group member sessions **by Program** (not counters-only). | Yes |

### Explicitly retired (not MVP, not later-as-wallet)

- Credit lots / credit ledger / 30-day wallet expiry (Q5, Q15) — **refund to source** instead.
- Voluntary member reschedule of an attendable session (FR-54 / policy cl.3) — **out of MVP**.

---

## 2. MVP vs future (PM tracker)

### In MVP

| Area | Scope |
|------|--------|
| Part A | Programs CRUD, Program price at checkout, composition across batches/instructors, FR-17 time collision, FR-20 Sessions by Program |
| A1.1 | Freeze `per_session_allocation` at purchase; backfill paid rows where possible |
| Part B (MVP slice) | `session_ledger` consume-on-elapse; counters; **amounts derivable for CA export** (Option B). Idempotent sweeper |
| Part C (after B) | Platform/instructor cancel → unscheduled → reschedule window → proportionate **refund to source**; guest full refund; no wallet |
| Legal | Policy v2.0 effective **2026-08-03**; clickwrap + version archive |
| Ops | Prefix-based QA purge; Guard B |

### Deferred (post-MVP / future scope)

| ID | Item | Why deferred |
|----|------|--------------|
| **GL-A** | In-app accounting journal (Dr/Cr Contract Liability ↔ Revenue) | MVP uses **export (B)**; CA posts externally |
| **GST split** | Base/tax on credit notes (OI-15) | Pre-registration; confirm with CA later |
| **FR-54** | Member-initiated voluntary reschedule | Policy forbids for attendable sessions |
| **Waitlist on release** | Notify waitlist when seat freed by reschedule | Must not break; not required to ship C |
| **OI-05** | Drop `class_types.price` column | After Programs proven in prod |
| **OI-06** | Instructor premium pricing | Deferred earlier |
| **In-app GL reports** | Admin books UI | Follows GL-A |

---

## 3. Option B — revenue export (MVP definition)

**Member-facing truth:** Program purchase, seats, consume-on-elapse, refunds to source.

**Accounting MVP:**  
For each subscription the system can report:

- `total_paid` (₹), `sessions_purchased`, `per_session_allocation` (8 dp)  
- `sessions_consumed` → suggested recognised revenue = `ROUND(consumed × allocation, 2)` per CA rules  
- Deferred remaining = paid − recognised (using posting-time rounding)  
- Refunds issued = `ROUND(n × allocation, 2)`

CA (or finance) posts journals in Tally/Zoho/etc. App does **not** own a full GL in MVP.

**Future (GL-A):** durable `accounting_entries` (or equivalent) written by the sweeper on consume/refund; admin audit report.

---

## 4. Build sequence (agreed)

1. Park andWeFuel WIP; restore Programs stash on sessions branch  
2. Land **A2–A5 + FR-17** (+ **FR-20**); commit  
3. **A1.1** schema + freeze + backfill  
4. **FR-15** atomic composition + drop `flexi_selection_count`  
5. Purge **safer end state** (prefix-only fixtures)  
6. Deepen Part B for **exportable accrual inputs** (still Option B)  
7. Part C + **clickwrap** (policy version `cancellation-refund-v2.0`, effective 2026-08-03)

---

## 5. Policy clickwrap (signed off)

| Field | Value |
|-------|-------|
| Document | Cancellation, Refund and Rescheduling Policy v2.0 |
| Effective date | **3 August 2026** |
| Grievance Officer | Mudit Arun — mudit@andweyoga.com — 221 2nd Floor SV Meadows Apartment Kodipalya Bengaluru 560060 |
| Checkout | Mandatory affirmative clickwrap (not pre-ticked) |
| Storage | Timestamp + exact policy version (same pattern as consent audit) |
| Amendments | Archive prior versions; booking governed by version accepted at purchase |

---

## 6. Change log

| Date | Change |
|------|--------|
| 2026-08-03 | Initial MVP scope note: GL-B, policy live, composition any instructor, FR-20 must, purge prefix-only, build sequence locked |
| 2026-08-03 | Branch `feature/spec-sessions-01-a2-c`: A2–A5+FR-17+A1.1 committed; FR-15 atomic composition + drop `flexi_selection_count`; Option B CA export helpers |

---

## 7. Implementation progress (engineering)

| Item | Status |
|------|--------|
| A2–A5 + FR-17 (restored WIP) | On branch `feature/spec-sessions-01-a2-c` |
| A1.1 column + freeze + SQL 039 | Done |
| Purge prefix-only (no Hatha name match) | Done |
| FR-20 Sessions by Program | Package nests by subscription (present); refine if needed |
| FR-15 one-transaction composition | Done (`reserveFlexiCompositionAtomic`) |
| Drop `flexi_selection_count` | Done (patch 040; Program.sessionsPerWeek owns N) |
| Part B export helpers for CA | Done (`shared/accounting-export` + `/api/admin/accounting/subscriptions-export`) |
| Part C + clickwrap | Done (cancel→unscheduled, refund sweep, clickwrap v2.0) |
| Member reschedule UI (FR-50/51) | Done (targets API + dialog on Cancelled tab) |

*Program managers: treat §2 “Deferred” as the backlog for post-MVP accounting and GST work. Do not reopen credit-wallet scope without a new policy amendment.*
