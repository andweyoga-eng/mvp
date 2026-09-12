import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateMobileNumber,
  getMobileUniquenessError,
  getFirstMobileUniquenessError,
} from "../shared/mobile-validation.ts";

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

describe("profile mobile uniqueness", () => {
  const base = {
    primaryMobile: "9988776655",
    primaryMobileCountryCode: "+91",
    emergencyMobile: "8877665544",
    emergencyMobileCountryCode: "+91",
    secondaryMobile: "",
    secondaryMobileCountryCode: "+91",
  };

  it("allows distinct primary and emergency", () => {
    assert.equal(getFirstMobileUniquenessError(base), null);
  });

  it("rejects emergency matching primary", () => {
    const err = getMobileUniquenessError("emergencyMobile", {
      ...base,
      emergencyMobile: "9988776655",
    });
    assert.match(err ?? "", /different from your mobile/);
  });

  it("rejects alternate matching primary or emergency", () => {
    assert.match(
      getMobileUniquenessError("secondaryMobile", {
        ...base,
        secondaryMobile: "9988776655",
      }) ?? "",
      /different from your mobile number/,
    );
    assert.match(
      getMobileUniquenessError("secondaryMobile", {
        ...base,
        secondaryMobile: "8877665544",
      }) ?? "",
      /different from your emergency/,
    );
  });
});
