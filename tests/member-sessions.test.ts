import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  memberSessionPaymentKey,
  sessionAwaitingPaymentUpdate,
  findUpcomingMemberSessionForClass,
  findUpcomingPendingSessionForClass,
  type MemberSession,
} from "../client/src/lib/member-sessions.ts";

function session(
  overrides: Partial<MemberSession> & Pick<MemberSession, "bookingId" | "paymentStatus">,
): MemberSession {
  return {
    id: "1",
    bookingId: overrides.bookingId,
    classId: overrides.classId ?? "class-1",
    className: "Flow",
    instructorName: "Alex",
    date: new Date().toISOString(),
    time: "10:00",
    status: "upcoming",
    paymentStatus: overrides.paymentStatus,
    verificationStatus: overrides.verificationStatus ?? null,
    googleMeetLink: null,
    receiptUrl: null,
    invoiceUrl: null,
    bookedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("memberSessionPaymentKey", () => {
  it("tracks pending payment and pending verification", () => {
    assert.equal(
      memberSessionPaymentKey(
        session({ bookingId: "a", paymentStatus: "pending", verificationStatus: null }),
      ),
      "pending",
    );
    assert.equal(
      memberSessionPaymentKey(
        session({ bookingId: "b", paymentStatus: "pending", verificationStatus: "pending" }),
      ),
      "pending-verify",
    );
    assert.equal(
      memberSessionPaymentKey(
        session({ bookingId: "c", paymentStatus: "paid", verificationStatus: "confirmed" }),
      ),
      "paid",
    );
  });
});

describe("findUpcomingMemberSessionForClass", () => {
  it("returns upcoming booking for the same class", () => {
    const rows = [
      session({
        bookingId: "b1",
        classId: "class-a",
        paymentStatus: "paid",
        status: "upcoming",
      }),
      session({
        bookingId: "b2",
        classId: "class-b",
        paymentStatus: "pending",
        status: "upcoming",
      }),
    ];
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-a")?.bookingId, "b1");
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-c"), undefined);
  });

  it("does not treat pending payment as already booked", () => {
    const rows = [
      session({
        bookingId: "b2",
        classId: "class-b",
        paymentStatus: "pending",
        status: "upcoming",
      }),
    ];
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-b"), undefined);
    assert.equal(findUpcomingPendingSessionForClass(rows, "class-b")?.bookingId, "b2");
  });

  it("ignores cancelled bookings for the same class", () => {
    const rows = [
      session({
        bookingId: "b1",
        classId: "class-a",
        paymentStatus: "paid",
        status: "cancelled",
      }),
    ];
    assert.equal(findUpcomingMemberSessionForClass(rows, "class-a"), undefined);
  });
});

describe("sessionAwaitingPaymentUpdate", () => {
  it("is true when an upcoming session awaits payment or verification", () => {
    assert.equal(
      sessionAwaitingPaymentUpdate([
        session({ bookingId: "x", paymentStatus: "pending", verificationStatus: "pending" }),
      ]),
      true,
    );
    assert.equal(
      sessionAwaitingPaymentUpdate([
        session({ bookingId: "y", paymentStatus: "paid", verificationStatus: "confirmed" }),
      ]),
      false,
    );
  });
});
