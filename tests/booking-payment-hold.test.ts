import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_PAYMENT_STATUS,
  bookingCountsTowardCapacity,
  canResumePaymentCheckout,
  holdExpiresAt,
  initialBookingHeldUntil,
  isPaymentHoldActive,
  PAYMENT_HOLD_MINUTES,
} from "../shared/booking-payment-hold.ts";

const futureSessionMs = Date.now() + 60 * 60 * 1000;
const activeHoldUntil = holdExpiresAt(Date.now()).toISOString();
const expiredHoldUntil = holdExpiresAt(Date.now() - (PAYMENT_HOLD_MINUTES + 1) * 60 * 1000).toISOString();

describe("booking payment hold", () => {
  it("initialBookingHeldUntil sets hold for paid sessions only", () => {
    const now = Date.now();
    const paid = initialBookingHeldUntil(true, now);
    assert.ok(paid);
    assert.equal(paid!.getTime(), now + PAYMENT_HOLD_MINUTES * 60 * 1000);
    assert.equal(initialBookingHeldUntil(false, now), null);
  });

  it("isPaymentHoldActive respects heldUntil", () => {
    const now = Date.now();
    assert.equal(isPaymentHoldActive(holdExpiresAt(now), now), true);
    assert.equal(isPaymentHoldActive(expiredHoldUntil, now), false);
    assert.equal(isPaymentHoldActive(null, now), false);
  });

  it("bookingCountsTowardCapacity for paid and waived", () => {
    assert.equal(bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.PAID), true);
    assert.equal(bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.WAIVED), true);
  });

  it("bookingCountsTowardCapacity releases cancelled and expired holds", () => {
    assert.equal(bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER), false);
    assert.equal(bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.HOLD_EXPIRED), false);
  });

  it("bookingCountsTowardCapacity for pending with active vs expired hold", () => {
    assert.equal(
      bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.PENDING, activeHoldUntil),
      true,
    );
    assert.equal(
      bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.PENDING, expiredHoldUntil),
      false,
    );
    assert.equal(bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.PENDING), true);
  });

  it("bookingCountsTowardCapacity for failed only while hold active", () => {
    assert.equal(
      bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.FAILED, activeHoldUntil),
      true,
    );
    assert.equal(
      bookingCountsTowardCapacity(BOOKING_PAYMENT_STATUS.FAILED, expiredHoldUntil),
      false,
    );
  });

  it("canResumePaymentCheckout mirrors hold rules for upcoming sessions", () => {
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.PENDING,
        heldUntil: activeHoldUntil,
        classSessionStartMs: futureSessionMs,
      }),
      true,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.FAILED,
        heldUntil: activeHoldUntil,
        classSessionStartMs: futureSessionMs,
      }),
      true,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.FAILED,
        heldUntil: expiredHoldUntil,
        classSessionStartMs: futureSessionMs,
      }),
      false,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.HOLD_EXPIRED,
        classSessionStartMs: futureSessionMs,
      }),
      false,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER,
        classSessionStartMs: futureSessionMs,
      }),
      false,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.PENDING,
        heldUntil: activeHoldUntil,
        mappingStatus: "cancelled",
        classSessionStartMs: futureSessionMs,
      }),
      false,
    );
    assert.equal(
      canResumePaymentCheckout({
        paymentStatus: BOOKING_PAYMENT_STATUS.PENDING,
        heldUntil: activeHoldUntil,
        classSessionStartMs: Date.now() - 1000,
      }),
      false,
    );
  });
});
