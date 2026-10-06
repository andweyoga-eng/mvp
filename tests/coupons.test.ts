import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDiscountPaise,
  computeFinalAmountPaise,
  evaluateCouponApplicability,
  isCouponNotExpired,
  normalizeCouponCode,
  COUPON_CREATE_DUMMY_OTP,
} from "../shared/coupons.ts";
import { verifyCouponCreateOtp } from "../server/coupon-service.ts";

describe("coupon expiry strictness", () => {
  it("is valid strictly before expiresAt", () => {
    const expiresAt = new Date("2026-12-31T18:00:00.000Z");
    assert.equal(isCouponNotExpired(expiresAt, expiresAt.getTime() - 1), true);
  });

  it("is invalid at expiresAt exactly", () => {
    const expiresAt = new Date("2026-12-31T18:00:00.000Z");
    assert.equal(isCouponNotExpired(expiresAt, expiresAt.getTime()), false);
  });

  it("is invalid one millisecond after expiresAt", () => {
    const expiresAt = new Date("2026-12-31T18:00:00.000Z");
    assert.equal(isCouponNotExpired(expiresAt, expiresAt.getTime() + 1), false);
  });
});

describe("coupon applicability", () => {
  const base = {
    status: "active" as const,
    expiresAt: new Date(Date.now() + 60_000),
    maxUses: 5,
    useCount: 0,
    classTypeId: null,
    classId: null,
    targetClassTypeId: "ct-1",
    targetClassId: "cls-1",
  };

  it("rejects expired coupons", () => {
    const result = evaluateCouponApplicability({
      ...base,
      expiresAt: new Date(Date.now() - 1),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "expired");
  });

  it("rejects at exact expiry instant", () => {
    const expiresAt = new Date("2026-07-01T12:00:00.000Z");
    const result = evaluateCouponApplicability({
      ...base,
      expiresAt,
      nowMs: expiresAt.getTime(),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "expired");
  });

  it("rejects wrong session type", () => {
    const result = evaluateCouponApplicability({
      ...base,
      classTypeId: "other-type",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "wrong_session_type");
  });
});

describe("coupon discount math", () => {
  it("computes percent discount", () => {
    assert.equal(computeDiscountPaise(10000, "percent", 20), 2000);
    assert.equal(computeFinalAmountPaise(10000, "percent", 20).finalPaise, 8000);
  });

  it("computes fixed discount in paise", () => {
    assert.equal(computeDiscountPaise(50000, "fixed", 15000), 15000);
    assert.equal(computeFinalAmountPaise(50000, "fixed", 15000).finalPaise, 35000);
  });

  it("never discounts below zero", () => {
    assert.equal(computeFinalAmountPaise(500, "fixed", 1000).finalPaise, 0);
  });
});

describe("coupon admin OTP (dummy)", () => {
  it("accepts the configured dummy OTP", () => {
    assert.equal(verifyCouponCreateOtp(COUPON_CREATE_DUMMY_OTP), true);
  });

  it("rejects wrong OTP", () => {
    assert.equal(verifyCouponCreateOtp("000000"), false);
  });
});

describe("normalizeCouponCode", () => {
  it("uppercases and trims", () => {
    assert.equal(normalizeCouponCode("  yoga20 "), "YOGA20");
  });
});
