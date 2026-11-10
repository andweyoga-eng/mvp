import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  memberSessionPaymentKey,
  sessionsNewlyPaymentVerified,
  type MemberSession,
} from "../client/src/lib/member-sessions.ts";

function session(
  overrides: Partial<MemberSession> & Pick<MemberSession, "bookingId">,
): MemberSession {
  return {
    id: "s1",
    classId: "class-1",
    className: "Morning Flow",
    instructorName: "Asha",
    date: "2026-06-01T06:00:00.000Z",
    time: "06:00",
    status: "upcoming",
    paymentStatus: "pending",
    verificationStatus: null,
    googleMeetLink: "https://meet.google.com/abc",
    meetJoinState: "disabled",
    receiptUrl: null,
    invoiceUrl: null,
    bookedAt: "2026-05-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("memberSessionPaymentKey (celebration)", () => {
  it("maps pending verification to pending-verify", () => {
    assert.equal(
      memberSessionPaymentKey({
        paymentStatus: "pending",
        verificationStatus: "pending",
      }),
      "pending-verify",
    );
  });

  it("maps paid payment to paid", () => {
    assert.equal(
      memberSessionPaymentKey({
        paymentStatus: "paid",
        verificationStatus: "verified",
      }),
      "paid",
    );
  });
});

describe("sessionsNewlyPaymentVerified", () => {
  it("detects transition from pending to paid", () => {
    const bookingId = "b1";
    const prev = new Map([[bookingId, "pending"]]);
    const rows = [
      session({
        bookingId,
        paymentStatus: "paid",
        verificationStatus: "verified",
      }),
    ];
    assert.equal(sessionsNewlyPaymentVerified(rows, prev).length, 1);
  });

  it("detects transition from pending-verify to paid", () => {
    const bookingId = "b2";
    const prev = new Map([[bookingId, "pending-verify"]]);
    const rows = [
      session({
        bookingId,
        paymentStatus: "paid",
        verificationStatus: "verified",
      }),
    ];
    assert.equal(sessionsNewlyPaymentVerified(rows, prev).length, 1);
  });

  it("ignores already-paid sessions with no prior awaiting state", () => {
    const bookingId = "b3";
    const prev = new Map([[bookingId, "paid"]]);
    const rows = [
      session({
        bookingId,
        paymentStatus: "paid",
        verificationStatus: "verified",
      }),
    ];
    assert.equal(sessionsNewlyPaymentVerified(rows, prev).length, 0);
  });
});
