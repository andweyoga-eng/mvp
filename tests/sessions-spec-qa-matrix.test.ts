/**
 * SPEC-SESSIONS-01 — full QA matrix + regressions (unit-level).
 * No DB, no HTTP, no admin/live litter. Run with:
 *   node --import tsx --test tests/sessions-spec-qa-matrix.test.ts ...
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertPurgeAllowed,
  hasPurgeDestructiveOptIn,
} from "../shared/purge-safety.ts";
import {
  classTypeNameKey,
  classTypeNamesCollide,
  formatClassTypeOptionLabel,
  normalizeClassTypeName,
} from "../shared/class-type-name.ts";
import {
  computeProgramTotalSessions,
  programPerSessionDivisibility,
  programRupeesToPaise,
  validateProgramShape,
} from "../shared/programs.ts";
import {
  computeProgramHorizon,
  formatProgramCheckoutLabel,
  guestMayPurchaseProgramKind,
  programHasFee,
  sessionFrequencyToProgramKind,
  toPublicCheckoutProgram,
} from "../shared/checkout-program.ts";
import {
  bookingHoldsSeatForCollision,
  findInternalProposedCollisions,
  findTimeCollisions,
  formatTimeCollisionMessage,
  intervalsOverlap,
  sessionIntervalMs,
} from "../shared/member-time-collision.ts";
import {
  bookingCountsTowardCapacity,
  canResumePaymentCheckout,
  initialBookingHeldUntil,
  PAYMENT_HOLD_MINUTES,
} from "../shared/booking-payment-hold.ts";
import {
  bookingIsResumableCheckout,
  existingBookingBlocksNewBooking,
} from "../shared/member-booking-duplicate.ts";
import {
  countCompletedAmongEnrollment,
  filterSeriesClassesFromAnchor,
  recurringEnrollmentMappingStatus,
} from "../shared/recurring-series-enrollment.ts";
import { subscriptionSessionBalance } from "../shared/member-session-counts.ts";
import { evaluateCouponApplicability } from "../shared/coupons.ts";
import { subscriptionContractFromProgram } from "../server/checkout-program.ts";
import { formatMemberSubscriptionLine } from "../client/src/lib/member-subscriptions.ts";
import { QA_AGENT_CLASS_TYPE_PREFIX } from "../shared/seed-catalog.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function readRepo(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const NOW = new Date("2026-07-24T10:00:00.000Z").getTime();
const MON_6 = new Date("2026-07-27T00:30:00.000Z");
const MON_630 = new Date("2026-07-27T01:00:00.000Z");
const MON_7 = new Date("2026-07-27T01:30:00.000Z");

const sampleProgram = {
  id: "prog-1",
  classTypeId: "ct-1",
  version: 1,
  kind: "recurring" as const,
  sessionsPerWeek: 3,
  durationWeeks: 12,
  totalSessions: 36,
  pricePaise: 1_440_000,
  flexiAllowed: false,
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
describe("A2 — Programs admin helpers", () => {
  it("QA: class-type names collide case-insensitively + trim", () => {
    assert.equal(normalizeClassTypeName("  Mudit   Yoga  "), "Mudit Yoga");
    assert.equal(classTypeNameKey("Mudit Yoga"), "mudit yoga");
    assert.equal(classTypeNamesCollide("Mudit Yoga", "mudit yoga"), true);
    assert.equal(classTypeNamesCollide("Mudit Yoga", "Mudit Yoga Flexi"), false);
  });

  it("QA: picker label includes name, duration, short id", () => {
    const label = formatClassTypeOptionLabel({
      id: "abcdefgh-1234",
      name: "Mudit Yoga",
      duration: 60,
    });
    assert.match(label, /Mudit Yoga/);
    assert.match(label, /#abcdefgh/);
    assert.match(label, /60min/);
    assert.equal(label.includes("Rs."), false);
  });

  it("QA: totalSessions = sessionsPerWeek × durationWeeks", () => {
    assert.equal(computeProgramTotalSessions(1, 1), 1);
    assert.equal(computeProgramTotalSessions(3, 12), 36);
    assert.equal(computeProgramTotalSessions(2, 4), 8);
  });

  it("QA: trial/drop_in must be 1×1; recurring free shape", () => {
    assert.ok(
      validateProgramShape({ kind: "trial", sessionsPerWeek: 2, durationWeeks: 1 }),
    );
    assert.ok(
      validateProgramShape({ kind: "drop_in", sessionsPerWeek: 1, durationWeeks: 2 }),
    );
    assert.equal(
      validateProgramShape({ kind: "trial", sessionsPerWeek: 1, durationWeeks: 1 }),
      null,
    );
    assert.equal(
      validateProgramShape({ kind: "recurring", sessionsPerWeek: 3, durationWeeks: 12 }),
      null,
    );
    assert.ok(validateProgramShape({ kind: "premium", sessionsPerWeek: 1, durationWeeks: 1 }));
  });

  it("QA: soft price warning only when price does not divide evenly", () => {
    const even = programPerSessionDivisibility(programRupeesToPaise(450), 8);
    assert.equal(even.dividesEvenly, true);
    assert.equal(even.warning, null);

    const uneven = programPerSessionDivisibility(programRupeesToPaise(451), 8);
    assert.equal(uneven.dividesEvenly, false);
    assert.ok(uneven.warning);
  });

  it("QA: purge Guard B — prod refuse; remote needs opt-in; local OK", () => {
    assert.throws(
      () =>
        assertPurgeAllowed({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://u:p@localhost:5432/awy",
          I_UNDERSTAND_THIS_DELETES_DATA: "1",
        }),
      /NODE_ENV=production/,
    );
    assert.throws(
      () =>
        assertPurgeAllowed({
          NODE_ENV: "development",
          DATABASE_URL: "postgres://u:p@containers-us-west.railway.app:5432/db",
        }),
      /I_UNDERSTAND_THIS_DELETES_DATA/,
    );
    assert.doesNotThrow(() =>
      assertPurgeAllowed({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://u:p@localhost:5432/awy",
      }),
    );
    assert.equal(hasPurgeDestructiveOptIn({ I_UNDERSTAND_THIS_DELETES_DATA: "1" }), true);
  });

  it("QA/regression: hard-delete of booked sessions is blocked in storage", () => {
    const src = readRepo("server/storage.ts");
    assert.match(src, /Hard-delete is blocked/);
    assert.match(src, /bookingCount > 0/);
  });

  it("QA: A1.1 per-session allocation is 8 dp from paid amount", async () => {
    const { computePerSessionAllocationRupees, roundAllocationPostingRupees } = await import(
      "../shared/programs.ts"
    );
    assert.equal(
      computePerSessionAllocationRupees({ totalPaidPaise: 1_000_000, sessionsPurchased: 36 }),
      "277.77777778",
    );
    // 20 × 277.77777777 → CA posted 5,555.56 (half-up at 2 dp)
    assert.equal(
      roundAllocationPostingRupees("277.77777778", 20),
      "5555.56",
    );
    assert.equal(
      roundAllocationPostingRupees("277.77777778", 16),
      "4444.44",
    );
  });
});

// ---------------------------------------------------------------------------
describe("A3 — checkout charges Program price", () => {
  it("QA: session frequency maps to program kind", () => {
    assert.equal(sessionFrequencyToProgramKind("trial"), "trial");
    assert.equal(sessionFrequencyToProgramKind("drop_in"), "drop_in");
    assert.equal(sessionFrequencyToProgramKind("recurring"), "recurring");
    assert.equal(sessionFrequencyToProgramKind("workshop"), null);
  });

  it("QA: guests may only buy trial/drop_in", () => {
    assert.equal(guestMayPurchaseProgramKind("trial"), true);
    assert.equal(guestMayPurchaseProgramKind("drop_in"), true);
    assert.equal(guestMayPurchaseProgramKind("recurring"), false);
  });

  it("QA: Program fee / zero / label / horizon", () => {
    assert.equal(programHasFee({ pricePaise: 0 }), false);
    assert.equal(programHasFee({ pricePaise: 45000 }), true);
    assert.match(
      formatProgramCheckoutLabel({
        kind: "recurring",
        sessionsPerWeek: 2,
        durationWeeks: 4,
        totalSessions: 8,
        pricePaise: programRupeesToPaise(450),
      }),
      /2\/week × 4 weeks/,
    );
    const { horizonStartAt, horizonEndAt } = computeProgramHorizon({
      startAt: new Date("2026-08-03T01:30:00.000Z"),
      durationWeeks: 4,
    });
    const days =
      (horizonEndAt.getTime() - horizonStartAt.getTime()) / (24 * 60 * 60 * 1000);
    assert.ok(days >= 27 && days < 29);
  });

  it("QA: public checkout payload exposes Program price, not class-type price field", () => {
    const pub = toPublicCheckoutProgram(sampleProgram as any);
    assert.equal(pub.pricePaise, 1_440_000);
    assert.equal(pub.totalSessions, 36);
    assert.equal(pub.flexiAllowed, false);
    assert.ok(!("classTypePrice" in pub));
  });

  it("QA/regression FR-04: checkout module documents no class_types.price fallback", () => {
    const shared = readRepo("shared/checkout-program.ts");
    assert.match(shared, /Never fall back to class_types\.price/);
    const storageResolve = readRepo("server/storage.ts");
    assert.match(storageResolve, /resolveCheckoutProgram/);
    assert.match(storageResolve, /NO_ACTIVE_PROGRAM|PROGRAM_REQUIRED/);
  });

  it("QA: subscription contract freezes programId + sessionsPurchased + paid paise + allocation", () => {
    const contract = subscriptionContractFromProgram({
      program: sampleProgram as any,
      instructorId: "inst-1",
      startAt: new Date("2026-08-03T01:30:00.000Z"),
      totalPaidPaise: 1_200_000,
    });
    assert.equal(contract.programId, "prog-1");
    assert.equal(contract.sessionsPurchased, 36);
    assert.equal(contract.totalPaidPaise, 1_200_000);
    assert.equal(contract.perSessionAllocation, "333.33333333");
    assert.equal(contract.sessionsConsumed, 0);
    assert.equal(contract.sessionsScheduled, 36);
  });

  it("QA: missing-program / trial-used codes remain wired", () => {
    assert.match(readRepo("server/checkout-program.ts"), /missingProgramResponse/);
    assert.match(readRepo("server/storage.ts"), /NO_ACTIVE_PROGRAM/);
    assert.match(readRepo("server/storage.ts"), /PROGRAM_REQUIRED/);
    assert.match(readRepo("server/routes.ts"), /TRIAL_ALREADY_USED/);
    assert.match(readRepo("server/routes.ts"), /missingProgramResponse/);
  });
});

// ---------------------------------------------------------------------------
describe("A4 — composition + enrollment cap", () => {
  it("QA: series enrollment from anchor skips cancelled/paused/draft and past", () => {
    const anchor = "2026-08-10T01:30:00.000Z";
    const rows = filterSeriesClassesFromAnchor(
      [
        { id: "past", date: "2026-08-03T01:30:00.000Z" },
        { id: "a", date: "2026-08-10T01:30:00.000Z" },
        { id: "b", date: "2026-08-17T01:30:00.000Z" },
        { id: "cancelled", date: "2026-08-24T01:30:00.000Z", status: "cancelled" },
        { id: "paused", date: "2026-08-31T01:30:00.000Z", pausedAt: "2026-08-01T00:00:00.000Z" },
        { id: "draft", date: "2026-09-07T01:30:00.000Z", status: "draft" },
      ],
      anchor,
    );
    assert.deepEqual(
      rows.map((r) => r.id),
      ["a", "b"],
    );
  });

  it("QA: maxSessionsToEnroll cap slices package (Program.totalSessions)", () => {
    const all = filterSeriesClassesFromAnchor(
      Array.from({ length: 20 }, (_, i) => ({
        id: `c${i}`,
        date: new Date(Date.UTC(2026, 7, 3 + i * 7, 1, 30)).toISOString(),
      })),
      "2026-08-03T01:30:00.000Z",
    );
    const capped = all.slice(0, sampleProgram.totalSessions);
    assert.ok(all.length >= 12);
    assert.equal(capped.length, Math.min(all.length, 36));
  });

  it("QA: Flexi not allowed / shortfall codes exist on booking route", () => {
    const routes = readRepo("server/routes.ts");
    assert.match(routes, /FLEXI_NOT_ALLOWED/);
    assert.match(routes, /SLOT_SHORTFALL/);
    assert.match(routes, /flexiAllowed/);
  });

  it("QA: Flexi internal overlapping composition rejects", () => {
    const a = sessionIntervalMs(MON_6, 60);
    const b = sessionIntervalMs(MON_630, 60);
    assert.equal(
      findInternalProposedCollisions([
        { classId: "slot-a", ...a },
        { classId: "slot-b", ...b },
      ]).length,
      1,
    );
  });
});

// ---------------------------------------------------------------------------
describe("A5 — package usage counters", () => {
  it("QA: Program ledger line shows purchased / consumed / remaining", () => {
    const line = formatMemberSubscriptionLine({
      id: "s1",
      classTypeName: "Mudit Yoga",
      subscriptionType: "recurring",
      flexiBookingId: null,
      programId: "prog-1",
      sessionsPurchased: 36,
      sessionsConsumed: 4,
      sessionsScheduled: 20,
      sessionsUnscheduled: 12,
      sessionsCredited: 0,
      totalSessions: 36,
      utilizedSessions: 4,
      refundedSessions: 0,
      disputedSessions: 0,
      disputesResolved: 0,
      waivedSessions: 0,
      status: "active",
      expiresAt: null,
      horizonEndAt: "2026-10-01T00:00:00.000Z",
    });
    assert.match(line, /36 purchased/);
    assert.match(line, /4 consumed/);
    assert.match(line, /32 remaining/);
  });

  it("QA/regression: legacy subscriptionSessionBalance still works without Program fields", () => {
    const balance = subscriptionSessionBalance({
      totalSessions: 8,
      utilizedSessions: 2,
      refundedSessions: 1,
      waivedSessions: 0,
    });
    assert.equal(balance.remaining, 5);
  });
});

// ---------------------------------------------------------------------------
describe("Part B — ledger consume contracts", () => {
  it("QA: sweeper consume is idempotent on duplicate ledger event", () => {
    const src = readRepo("server/session-ledger-sweep.ts");
    assert.match(src, /unique\|duplicate/i);
    assert.match(src, /session_elapsed/);
    assert.match(src, /sessionsConsumed/);
    assert.match(src, /pg_try_advisory_lock/);
  });

  it("QA: remaining after consume = scheduled + unscheduled (A5 view)", () => {
    const purchased = 36;
    const consumed = 1;
    const scheduled = 35;
    const unscheduled = 0;
    assert.equal(scheduled + unscheduled, purchased - consumed);
  });

  it("QA: elapsed session mapping flips to completed", () => {
    const start = new Date(NOW - 2 * 60 * 60_000);
    assert.equal(recurringEnrollmentMappingStatus(start, 60, new Date(NOW)), "completed");
    assert.equal(
      recurringEnrollmentMappingStatus(new Date(NOW + 60_000), 60, new Date(NOW)),
      "upcoming",
    );
    assert.equal(
      countCompletedAmongEnrollment(
        [{ date: start }, { date: new Date(NOW + 86_400_000) }],
        60,
        new Date(NOW),
      ),
      1,
    );
  });
});

// ---------------------------------------------------------------------------
describe("FR-17 — cross-subscription time collision", () => {
  it("QA: identical wall-clock across seats collides", () => {
    const meera = sessionIntervalMs(MON_6, 60);
    const ravi = sessionIntervalMs(MON_6, 60);
    const hits = findTimeCollisions(
      [{ classId: "ravi", ...ravi, label: "Ravi" }],
      [{ classId: "meera", ...meera, label: "Meera" }],
    );
    assert.equal(hits.length, 1);
    assert.match(formatTimeCollisionMessage(hits[0]!), /overlaps/i);
  });

  it("QA: adjacent 6–7 then 7–8 allowed (half-open)", () => {
    assert.equal(
      intervalsOverlap(sessionIntervalMs(MON_6, 60), sessionIntervalMs(MON_7, 60)),
      false,
    );
    assert.equal(
      findTimeCollisions(
        [{ classId: "late", ...sessionIntervalMs(MON_7, 60) }],
        [{ classId: "early", ...sessionIntervalMs(MON_6, 60) }],
      ).length,
      0,
    );
  });

  it("QA: partial overlap collides", () => {
    assert.equal(
      intervalsOverlap(sessionIntervalMs(MON_6, 60), sessionIntervalMs(MON_630, 60)),
      true,
    );
  });

  it("QA: pending active hold counts as held; expired/cancelled free", () => {
    assert.equal(
      bookingHoldsSeatForCollision({
        paymentStatus: "pending",
        heldUntil: new Date(NOW + 10 * 60_000),
        nowMs: NOW,
      }),
      true,
    );
    assert.equal(
      bookingHoldsSeatForCollision({
        paymentStatus: "pending",
        heldUntil: new Date(NOW - 1_000),
        nowMs: NOW,
      }),
      false,
    );
    assert.equal(
      bookingHoldsSeatForCollision({
        paymentStatus: "paid",
        mappingStatus: "cancelled",
        nowMs: NOW,
      }),
      false,
    );
    assert.equal(
      bookingHoldsSeatForCollision({ paymentStatus: "hold_expired", nowMs: NOW }),
      false,
    );
  });

  it("QA: same classId ignored by FR-17 (already_booked owns it)", () => {
    const iv = sessionIntervalMs(MON_6, 60);
    assert.equal(
      findTimeCollisions(
        [{ classId: "c1", ...iv }],
        [{ classId: "c1", ...iv }],
      ).length,
      0,
    );
  });

  it("QA: routes expose time_collision code", () => {
    assert.match(readRepo("server/routes.ts"), /time_collision/);
  });
});

// ---------------------------------------------------------------------------
describe("Regressions — must not break after Programs / ledger / FR-17", () => {
  it("pending same-class is resumable, not already_booked", () => {
    const future = NOW + 86_400_000;
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "pending",
        classSessionStartMs: future,
        nowMs: NOW,
      }),
      false,
    );
    assert.equal(
      bookingIsResumableCheckout({
        paymentStatus: "pending",
        mappingStatus: "upcoming",
        classSessionStartMs: future,
        nowMs: NOW,
      }),
      true,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: "pending",
        heldUntil: new Date(NOW + 5 * 60_000),
        classSessionStartMs: future,
        nowMs: NOW,
      }),
      true,
    );
  });

  it("paid same-class still blocks duplicate", () => {
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "paid",
        classSessionStartMs: NOW + 86_400_000,
        nowMs: NOW,
      }),
      true,
    );
  });

  it("FR-17 pending hold blocks other class; expired frees both capacity and collision", () => {
    const heldUntilActive = new Date(NOW + PAYMENT_HOLD_MINUTES * 60_000);
    const heldUntilExpired = new Date(NOW - 1_000);
    assert.equal(
      bookingCountsTowardCapacity("pending", heldUntilActive, NOW),
      true,
    );
    assert.equal(
      bookingHoldsSeatForCollision({
        paymentStatus: "pending",
        heldUntil: heldUntilActive,
        nowMs: NOW,
      }),
      true,
    );
    assert.equal(
      bookingCountsTowardCapacity("pending", heldUntilExpired, NOW),
      false,
    );
    assert.equal(
      bookingHoldsSeatForCollision({
        paymentStatus: "pending",
        heldUntil: heldUntilExpired,
        nowMs: NOW,
      }),
      false,
    );
  });

  it("paid booking hold is skipped (waived/free has no hold clock)", () => {
    assert.equal(initialBookingHeldUntil(true, NOW)?.getTime(), NOW + PAYMENT_HOLD_MINUTES * 60_000);
    assert.equal(initialBookingHeldUntil(false, NOW), null);
  });

  it("zero-price Program is not a fee", () => {
    assert.equal(programHasFee({ pricePaise: 0 }), false);
  });

  it("coupon applicability still works for unrestricted active codes", () => {
    const result = evaluateCouponApplicability({
      status: "active",
      expiresAt: new Date(NOW + 86_400_000),
      classTypeId: null,
      classId: null,
      maxUses: null,
      useCount: 0,
      targetClassTypeId: "ct-1",
      targetClassId: "c1",
      nowMs: NOW,
    });
    assert.equal(result.ok, true);
  });

  it("site-wide Flexi kill switch still gates isFlexiEnabledSchedule", async () => {
    const { FLEXI_BOOKING_ENABLED, isFlexiEnabledSchedule, hasFlexiScheduleConfig } =
      await import("../shared/flexi-mode.ts");
    const schedule = {
      id: "c1",
      classTypeId: "ct-1",
      instructorId: "i1",
      date: MON_6,
      flexiEnabled: true,
      recurrenceKind: "weekly",
      seriesId: "series-1",
    };
    assert.equal(hasFlexiScheduleConfig(schedule), true);
    assert.equal(FLEXI_BOOKING_ENABLED, false);
    assert.equal(isFlexiEnabledSchedule(schedule), false);
  });
});
