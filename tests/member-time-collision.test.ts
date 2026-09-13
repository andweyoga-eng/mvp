/**
 * SPEC-SESSIONS-01 FR-17 — cross-subscription time collision rules.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bookingHoldsSeatForCollision,
  findInternalProposedCollisions,
  findTimeCollisions,
  formatTimeCollisionMessage,
  intervalsOverlap,
  sessionIntervalMs,
} from "../shared/member-time-collision.ts";

const NOW = new Date("2026-07-23T10:00:00.000Z").getTime();
const MON_6AM = new Date("2026-07-27T00:30:00.000Z"); // 6:00 IST ≈ 00:30 UTC
const MON_6AM_RAVI = new Date("2026-07-27T00:30:00.000Z");
const MON_7AM = new Date("2026-07-27T01:30:00.000Z");
const MON_630 = new Date("2026-07-27T01:00:00.000Z");

describe("sessionIntervalMs / intervalsOverlap", () => {
  it("builds [start, end) from duration", () => {
    const interval = sessionIntervalMs(MON_6AM, 60);
    assert.equal(interval.startMs, MON_6AM.getTime());
    assert.equal(interval.endMs, MON_6AM.getTime() + 60 * 60_000);
  });

  it("treats touching end→start as non-overlap (half-open)", () => {
    const a = sessionIntervalMs(MON_6AM, 60);
    const b = sessionIntervalMs(MON_7AM, 60);
    assert.equal(intervalsOverlap(a, b), false);
  });

  it("detects partial overlap", () => {
    const a = sessionIntervalMs(MON_6AM, 60);
    const b = sessionIntervalMs(MON_630, 60);
    assert.equal(intervalsOverlap(a, b), true);
  });

  it("detects identical wall-clock on different seats", () => {
    const a = sessionIntervalMs(MON_6AM, 60);
    const b = sessionIntervalMs(MON_6AM_RAVI, 60);
    assert.equal(intervalsOverlap(a, b), true);
  });
});

describe("bookingHoldsSeatForCollision", () => {
  it("holds paid and waived seats", () => {
    assert.equal(
      bookingHoldsSeatForCollision({ paymentStatus: "paid", nowMs: NOW }),
      true,
    );
    assert.equal(
      bookingHoldsSeatForCollision({ paymentStatus: "waived", nowMs: NOW }),
      true,
    );
  });

  it("holds active pending payment (FR-17 default)", () => {
    assert.equal(
      bookingHoldsSeatForCollision({
        paymentStatus: "pending",
        heldUntil: new Date(NOW + 10 * 60_000),
        nowMs: NOW,
      }),
      true,
    );
  });

  it("releases expired hold and cancelled mapping", () => {
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
      bookingHoldsSeatForCollision({
        paymentStatus: "hold_expired",
        nowMs: NOW,
      }),
      false,
    );
  });
});

describe("findTimeCollisions", () => {
  it("ignores the same classId (already_booked owns that rule)", () => {
    const meera = sessionIntervalMs(MON_6AM, 60);
    const collisions = findTimeCollisions(
      [{ classId: "c1", ...meera, label: "Meera" }],
      [{ classId: "c1", ...meera, label: "Meera" }],
    );
    assert.equal(collisions.length, 0);
  });

  it("flags Meera 6am vs Ravi 6am across subscriptions", () => {
    const meera = sessionIntervalMs(MON_6AM, 60);
    const ravi = sessionIntervalMs(MON_6AM_RAVI, 60);
    const collisions = findTimeCollisions(
      [{ classId: "ravi-mon", ...ravi, label: "Ravi Mon 6am" }],
      [{ classId: "meera-mon", ...meera, label: "Meera Mon 6am" }],
    );
    assert.equal(collisions.length, 1);
    assert.equal(collisions[0]!.heldClassId, "meera-mon");
    assert.match(formatTimeCollisionMessage(collisions[0]!), /overlaps/i);
  });

  it("allows adjacent sessions (6–7 then 7–8)", () => {
    const early = sessionIntervalMs(MON_6AM, 60);
    const late = sessionIntervalMs(MON_7AM, 60);
    const collisions = findTimeCollisions(
      [{ classId: "late", ...late }],
      [{ classId: "early", ...early }],
    );
    assert.equal(collisions.length, 0);
  });
});

describe("findInternalProposedCollisions", () => {
  it("rejects Flexi composition that picks two overlapping slots", () => {
    const a = sessionIntervalMs(MON_6AM, 60);
    const b = sessionIntervalMs(MON_630, 60);
    const collisions = findInternalProposedCollisions([
      { classId: "slot-a", ...a },
      { classId: "slot-b", ...b },
    ]);
    assert.equal(collisions.length, 1);
  });
});
