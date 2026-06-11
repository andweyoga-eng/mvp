/**
 * Whether an existing booking should block a new booking for the same upcoming class.
 * Mirrors server `userHasUpcomingBookingForClass` and client `findUpcomingMemberSessionForClass`.
 */
export function existingBookingBlocksNewBooking(params: {
  hasBookingRow: boolean;
  mappingStatus: string | null | undefined;
  paymentStatus: string;
  classSessionStartMs: number;
  nowMs?: number;
}): boolean {
  if (!params.hasBookingRow) return false;
  const now = params.nowMs ?? Date.now();
  if (params.classSessionStartMs < now) return false;
  if (params.mappingStatus === "cancelled") return false;
  return params.paymentStatus === "paid" || params.paymentStatus === "waived";
}

/** Seats held on the class — pending checkout still reserves a spot. */
export function bookingCountsTowardCapacity(paymentStatus: string): boolean {
  return (
    paymentStatus === "pending" ||
    paymentStatus === "paid" ||
    paymentStatus === "waived"
  );
}

/** Pending payment can resume checkout instead of creating another booking row. */
export function bookingIsResumableCheckout(params: {
  paymentStatus: string;
  mappingStatus: string | null | undefined;
  classSessionStartMs: number;
  nowMs?: number;
}): boolean {
  const now = params.nowMs ?? Date.now();
  if (params.classSessionStartMs < now) return false;
  if (params.mappingStatus === "cancelled") return false;
  return params.paymentStatus === "pending";
}
