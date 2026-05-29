import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeGuestPhoneInput,
  validateOptionalGuestPhone,
} from "../shared/guest-phone.ts";

describe("guest phone", () => {
  it("strips non-digits and caps at 10 characters", () => {
    assert.equal(sanitizeGuestPhoneInput("98765-43210 (mobile)"), "9876543210");
    assert.equal(sanitizeGuestPhoneInput("12345678901234"), "1234567890");
  });

  it("rejects partial or garbage numbers", () => {
    const bad = validateOptionalGuestPhone("98abc");
    assert.equal(bad.ok, false);
    const good = validateOptionalGuestPhone("9876543210");
    assert.equal(good.ok, true);
    if (good.ok) assert.equal(good.normalized, "9876543210");
  });

  it("allows empty phone", () => {
    const empty = validateOptionalGuestPhone("");
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.normalized, "");
  });
});
