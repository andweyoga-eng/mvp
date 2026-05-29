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
