import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeGuestPhoneInput,
  validateRequiredGuestPhone,
  validateOptionalGuestPhone,
} from "../shared/guest-phone.ts";

describe("guest phone", () => {
  it("strips non-digits and caps at 10 characters", () => {
    assert.equal(sanitizeGuestPhoneInput("98765-43210 (mobile)"), "9876543210");
    assert.equal(sanitizeGuestPhoneInput("12345678901234"), "1234567890");
  });

  it("validateRequiredGuestPhone rejects partial or garbage numbers", () => {
    const bad = validateRequiredGuestPhone("98abc");
    assert.equal(bad.ok, false);
    const good = validateRequiredGuestPhone("9876543210");
    assert.equal(good.ok, true);
    if (good.ok) assert.equal(good.normalized, "9876543210");
  });

  it("validateRequiredGuestPhone rejects empty phone", () => {
    const empty = validateRequiredGuestPhone("");
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.match(empty.message, /required/i);
  });

  it("validateOptionalGuestPhone rejects empty phone", () => {
    const empty = validateOptionalGuestPhone("");
    assert.equal(empty.ok, false);
  });
});
