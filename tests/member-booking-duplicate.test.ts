/**
 * Duplicate-booking rules: pending reservations must not block re-book or show "already booked".
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  existingBookingBlocksNewBooking,
  bookingCountsTowardCapacity,
  bookingIsResumableCheckout,
} from "../shared/member-booking-duplicate.ts";
import {
  findUpcomingMemberSessionForClass,
  findUpcomingPendingSessionForClass,
  type MemberSession,
} from "../client/src/lib/member-sessions.ts";

const FUTURE_MS = new Date("2026-06-01T10:00:00.000Z").getTime();
const NOW_MS = new Date("2026-05-19T12:00:00.000Z").getTime();

function session(
  overrides: Partial<MemberSession> & Pick<MemberSession, "bookingId" | "paymentStatus">,
): MemberSession {
  return {
    id: "1",
    bookingId: overrides.bookingId,
    classId: overrides.classId ?? "class-warrior",
    className: "Warrior Yoga",
    instructorName: "Deepthi",
    date: new Date(FUTURE_MS).toISOString(),
    time: "10:00",
    status: overrides.status ?? "upcoming",
    paymentStatus: overrides.paymentStatus,
    verificationStatus: overrides.verificationStatus ?? null,
    googleMeetLink: null,
    receiptUrl: null,
    invoiceUrl: null,
    bookedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("existingBookingBlocksNewBooking (server parity)", () => {
  it("does not block when payment is pending", () => {
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "pending",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      false,
    );
  });

  it("blocks when payment is paid or waived", () => {
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "paid",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      true,
    );
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "waived",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      true,
    );
  });

  it("does not block cancelled mapping or past class", () => {
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "cancelled",
        paymentStatus: "paid",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      false,
    );
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "paid",
        classSessionStartMs: NOW_MS - 60_000,
        nowMs: NOW_MS,
      }),
      false,
    );
  });
});

describe("bookingCountsTowardCapacity", () => {
  it("counts pending reservations toward class capacity", () => {
    assert.equal(bookingCountsTowardCapacity("pending"), true);
    assert.equal(bookingCountsTowardCapacity("paid"), true);
    assert.equal(bookingCountsTowardCapacity("failed"), false);
  });
});

describe("bookingIsResumableCheckout", () => {
  it("allows resuming pending checkout for upcoming sessions", () => {
    assert.equal(
      bookingIsResumableCheckout({
        paymentStatus: "pending",
        mappingStatus: "upcoming",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      true,
    );
    assert.equal(
      bookingIsResumableCheckout({
        paymentStatus: "paid",
        mappingStatus: "upcoming",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      false,
    );
  });
});

describe("client/server duplicate-booking parity", () => {
  it("pending upcoming session is retryable, not already booked", () => {
    const rows = [
      session({
        bookingId: "b-pending",
        classId: "class-warrior",
        paymentStatus: "pending",
        status: "upcoming",
      }),
    ];
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-warrior"), undefined);
    assert.equal(findUpcomingPendingSessionForClass(rows, "class-warrior")?.bookingId, "b-pending");
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "pending",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      false,
    );
  });

  it("paid upcoming session blocks new booking on client and shared rule", () => {
    const rows = [
      session({
        bookingId: "b-paid",
        classId: "class-warrior",
        paymentStatus: "paid",
        status: "upcoming",
      }),
    ];
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-warrior")?.bookingId, "b-paid");
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "paid",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      true,
    );
  });

  it("paid flexi occurrence blocks rebooking through its anchor class", () => {
    const rows = [
      session({
        bookingId: "b-flexi",
        classId: "class-occurrence",
        anchorClassId: "class-anchor",
        paymentStatus: "paid",
        status: "upcoming",
        isFlexi: true,
      }),
    ];
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-anchor")?.bookingId, "b-flexi");
    assert.equal(
      existingBookingBlocksNewBooking({
        hasBookingRow: true,
        mappingStatus: "upcoming",
        paymentStatus: "paid",
        classSessionStartMs: FUTURE_MS,
        nowMs: NOW_MS,
      }),
      true,
    );
  });
});
