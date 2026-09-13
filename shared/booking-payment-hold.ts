/** Razorpay Standard Checkout session length (seconds). Observed default ~12 minutes. */
export const RAZORPAY_CHECKOUT_TIMEOUT_SECONDS = 12 * 60;

/**
 * Seat hold from booking creation. Includes ~2 min buffer before the Razorpay
 * checkout window so the spot is not released while the member is paying.
 */
export const PAYMENT_HOLD_MINUTES = 14;

export const BOOKING_PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  WAIVED: "waived",
  FAILED: "failed",
  HOLD_EXPIRED: "hold_expired",
  CANCELLED_BY_USER: "cancelled_by_user",
} as const;

export type BookingPaymentStatus =
  (typeof BOOKING_PAYMENT_STATUS)[keyof typeof BOOKING_PAYMENT_STATUS];

export function holdExpiresAt(fromMs: number = Date.now()): Date {
  return new Date(fromMs + PAYMENT_HOLD_MINUTES * 60 * 1000);
}

/** Set on every new paid booking at creation (A-01). Free/waived sessions skip holds. */
export function initialBookingHeldUntil(hasPaidSession: boolean, fromMs?: number): Date | null {
  if (!hasPaidSession) return null;
  return holdExpiresAt(fromMs);
}

export function isPaymentHoldActive(
  heldUntil: Date | string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!heldUntil) return false;
  const t = heldUntil instanceof Date ? heldUntil.getTime() : new Date(heldUntil).getTime();
  return !Number.isNaN(t) && t > nowMs;
}

/**
 * Whether this booking row occupies a seat on the session.
 * Voluntary cancel and expired holds release immediately.
 */
export function bookingCountsTowardCapacity(
  paymentStatus: string,
  heldUntil?: Date | string | null,
  nowMs?: number,
): boolean {
  if (
    paymentStatus === BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER ||
    paymentStatus === BOOKING_PAYMENT_STATUS.HOLD_EXPIRED
  ) {
    return false;
  }
  if (
    paymentStatus === BOOKING_PAYMENT_STATUS.PAID ||
    paymentStatus === BOOKING_PAYMENT_STATUS.WAIVED
  ) {
    return true;
  }
  if (paymentStatus === BOOKING_PAYMENT_STATUS.PENDING) {
    if (heldUntil && !isPaymentHoldActive(heldUntil, nowMs)) return false;
    return true;
  }
  if (paymentStatus === BOOKING_PAYMENT_STATUS.FAILED) {
    return isPaymentHoldActive(heldUntil, nowMs);
  }
  return false;
}

/** Guest/member may resume Razorpay checkout on this booking. */
export function canResumePaymentCheckout(params: {
  paymentStatus: string;
  heldUntil?: Date | string | null;
  classSessionStartMs: number;
  mappingStatus?: string | null;
  nowMs?: number;
}): boolean {
  const now = params.nowMs ?? Date.now();
  if (params.classSessionStartMs < now) return false;
  if (params.mappingStatus === "cancelled") return false;
  if (
    params.paymentStatus === BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER ||
    params.paymentStatus === BOOKING_PAYMENT_STATUS.HOLD_EXPIRED
  ) {
    return false;
  }
  if (params.paymentStatus === BOOKING_PAYMENT_STATUS.PENDING) {
    if (params.heldUntil && !isPaymentHoldActive(params.heldUntil, now)) return false;
    return true;
  }
  if (params.paymentStatus === BOOKING_PAYMENT_STATUS.FAILED) {
    return isPaymentHoldActive(params.heldUntil, now);
  }
  return false;
}

export function formatHoldExpiryIst(heldUntil: Date | string): string {
  const d = heldUntil instanceof Date ? heldUntil : new Date(heldUntil);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
