import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateMobileNumber } from "../shared/mobile-validation.ts";

describe("validateMobileNumber spam rules", () => {
  it("accepts real numbers with ascending/descending triplets", () => {
    for (const n of ["7406567897", "7521752390", "9732843170", "9876543210"]) {
      const result = validateMobileNumber(n, "+91");
      assert.equal(result.isValid, true, `expected ${n} to be valid`);
    }
  });

  it("rejects all same digit", () => {
    assert.equal(validateMobileNumber("9999999999", "+91").isValid, false);
  });

  it("rejects leading zeros", () => {
    assert.equal(validateMobileNumber("0123456789", "+91").isValid, false);
  });

  it("rejects five or more leading 1s", () => {
    assert.equal(validateMobileNumber("1111123456", "+91").isValid, false);
  });

  it("rejects five or more leading 9s", () => {
    assert.equal(validateMobileNumber("9999912345", "+91").isValid, false);
  });
});
