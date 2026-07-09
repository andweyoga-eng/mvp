import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEffectiveSessionPaymentStatus } from "../shared/session-payment-status";

describe("resolveEffectiveSessionPaymentStatus", () => {
  it("prefers an already-paid flexi session status", () => {
    assert.equal(
      resolveEffectiveSessionPaymentStatus({
        sessionPaymentStatus: "paid",
        bookingPaymentStatus: "pending",
        paymentRecordStatus: "created",
      }),
      "paid",
    );
  });

  it("recovers paid state from the linked booking", () => {
    assert.equal(
      resolveEffectiveSessionPaymentStatus({
        sessionPaymentStatus: "pending",
        bookingPaymentStatus: "paid",
        paymentRecordStatus: "created",
      }),
      "paid",
    );
  });

  it("recovers paid state from the payment record when flexi row is stale", () => {
    assert.equal(
      resolveEffectiveSessionPaymentStatus({
        sessionPaymentStatus: "pending",
        bookingPaymentStatus: "pending",
        paymentRecordStatus: "paid",
      }),
      "paid",
    );
  });

  it("falls back to the available pending-like status otherwise", () => {
    assert.equal(
      resolveEffectiveSessionPaymentStatus({
        sessionPaymentStatus: "pending",
        bookingPaymentStatus: "pending",
        paymentRecordStatus: "created",
      }),
      "pending",
    );
  });
});
