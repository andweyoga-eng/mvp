import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatSessionPrice,
  isValidPaymentUrl,
} from "../client/src/lib/booking-payment.ts";

describe("booking payment helpers", () => {
  it("formats INR price", () => {
    assert.equal(formatSessionPrice("500"), "₹500");
    assert.equal(formatSessionPrice(800), "₹800");
  });

  it("validates payment URLs", () => {
    assert.equal(isValidPaymentUrl("https://rzp.io/i/example"), true);
    assert.equal(isValidPaymentUrl(""), false);
    assert.equal(isValidPaymentUrl("not-a-url"), false);
  });
});
