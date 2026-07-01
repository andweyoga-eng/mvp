/**
 * Whether an existing booking should block a new booking for the same upcoming class.
 */
import {
  bookingCountsTowardCapacity as countsTowardCapacity,
  canResumePaymentCheckout,
  BOOKING_PAYMENT_STATUS,
} from "./booking-payment-hold";

export { countsTowardCapacity as bookingCountsTowardCapacity };

export function existingBookingBlocksNewBooking(params: {
  hasBookingRow: boolean;
  mappingStatus: string | null | undefined;
  paymentStatus: string;
  heldUntil?: Date | string | null;
  classSessionStartMs: number;
  nowMs?: number;
}): boolean {
  if (!params.hasBookingRow) return false;
  const now = params.nowMs ?? Date.now();
  if (params.classSessionStartMs < now) return false;
  if (params.mappingStatus === "cancelled") return false;
  return (
    params.paymentStatus === BOOKING_PAYMENT_STATUS.PAID ||
    params.paymentStatus === BOOKING_PAYMENT_STATUS.WAIVED
  );
}

/** Pending payment can resume checkout instead of creating another booking row. */
export function bookingIsResumableCheckout(params: {
  paymentStatus: string;
  heldUntil?: Date | string | null;
  mappingStatus: string | null | undefined;
  classSessionStartMs: number;
  nowMs?: number;
}): boolean {
  return canResumePaymentCheckout({
    paymentStatus: params.paymentStatus,
    heldUntil: params.heldUntil,
    mappingStatus: params.mappingStatus,
    classSessionStartMs: params.classSessionStartMs,
    nowMs: params.nowMs,
  });
}
