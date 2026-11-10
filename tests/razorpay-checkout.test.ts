import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeRazorpayContact } from "../client/src/lib/razorpay-checkout.ts";

describe("normalizeRazorpayContact", () => {
  it("returns undefined for empty input", () => {
    assert.equal(normalizeRazorpayContact(null), undefined);
    assert.equal(normalizeRazorpayContact(""), undefined);
    assert.equal(normalizeRazorpayContact("   "), undefined);
  });

  it("strips country code and non-digits to last 10 digits", () => {
    assert.equal(normalizeRazorpayContact("+91 95130 22331"), "9513022331");
    assert.equal(normalizeRazorpayContact("919513022331"), "9513022331");
  });

  it("returns undefined when fewer than 10 digits", () => {
    assert.equal(normalizeRazorpayContact("12345"), undefined);
  });
});
