/**
 * Coupon discount logic — shared between server validation and tests.
 * Expiry is strict: a coupon is valid only while now < expiresAt (not even one ms after).
 */

export const COUPON_DISCOUNT_TYPES = ["fixed", "percent"] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

export const COUPON_STATUSES = ["active", "revoked"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export const COUPON_SHARE_CHANNELS = ["email", "sms", "whatsapp"] as const;
export type CouponShareChannel = (typeof COUPON_SHARE_CHANNELS)[number];

/** Dummy OTP for coupon creation — replace with finance-controller email OTP later. */
export const COUPON_CREATE_DUMMY_OTP =
  (typeof process !== "undefined" && process.env?.COUPON_ADMIN_OTP?.trim()) || "123456";

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateCouponCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Strict expiry: valid only when nowMs is strictly less than expiresAt.
 * At expiresAt exactly (and any moment after), the coupon is expired.
 */
export function isCouponNotExpired(expiresAt: Date | string, nowMs: number = Date.now()): boolean {
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return false;
  return nowMs < expiresMs;
}

export function couponExpirySqlPredicate(): string {
  return "expires_at > CURRENT_TIMESTAMP";
}

export interface CouponApplicabilityInput {
  status: CouponStatus;
  expiresAt: Date | string;
  maxUses: number | null;
  useCount: number;
  classTypeId: string | null;
  classId: string | null;
  targetClassTypeId: string;
  targetClassId: string;
  nowMs?: number;
}

export type CouponRejectReason =
  | "not_found"
  | "revoked"
  | "expired"
  | "max_uses_reached"
  | "wrong_session_type"
  | "wrong_session";

export function evaluateCouponApplicability(
  coupon: CouponApplicabilityInput | null | undefined,
): { ok: true } | { ok: false; reason: CouponRejectReason } {
  if (!coupon) return { ok: false, reason: "not_found" };
  if (coupon.status !== "active") return { ok: false, reason: "revoked" };
  if (!isCouponNotExpired(coupon.expiresAt, coupon.nowMs)) {
    return { ok: false, reason: "expired" };
  }
  if (coupon.maxUses != null && coupon.useCount >= coupon.maxUses) {
    return { ok: false, reason: "max_uses_reached" };
  }
  if (coupon.classId && coupon.classId !== coupon.targetClassId) {
    return { ok: false, reason: "wrong_session" };
  }
  if (coupon.classTypeId && coupon.classTypeId !== coupon.targetClassTypeId) {
    return { ok: false, reason: "wrong_session_type" };
  }
  return { ok: true };
}

export function computeDiscountPaise(
  originalPaise: number,
  discountType: CouponDiscountType,
  discountValue: number,
): number {
  if (originalPaise <= 0) return 0;
  if (discountType === "fixed") {
    return Math.min(originalPaise, Math.max(0, discountValue));
  }
  const pct = Math.min(100, Math.max(0, discountValue));
  return Math.min(originalPaise, Math.round((originalPaise * pct) / 100));
}

export function computeFinalAmountPaise(
  originalPaise: number,
  discountType: CouponDiscountType,
  discountValue: number,
): { discountPaise: number; finalPaise: number } {
  const discountPaise = computeDiscountPaise(originalPaise, discountType, discountValue);
  return {
    discountPaise,
    finalPaise: Math.max(0, originalPaise - discountPaise),
  };
}

export function formatCouponDiscountLabel(
  discountType: CouponDiscountType,
  discountValue: number,
): string {
  if (discountType === "fixed") {
    return `₹${(discountValue / 100).toLocaleString("en-IN")} off`;
  }
  return `${discountValue}% off`;
}

export function couponUsageInstructions(code: string, expiresAt: Date | string): string {
  const deadline = new Date(expiresAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return [
    `Your andWeYoga coupon code is ${code}.`,
    "Apply it at checkout before paying for your session.",
    "Enter the code in the coupon field on the payment screen.",
    `This code expires at ${deadline} — it will not work after that moment.`,
  ].join(" ");
}
