export type SessionPaymentStatus = string | null | undefined;

function isPaidLike(status: SessionPaymentStatus): boolean {
  return status === "paid" || status === "waived";
}

/**
 * Flexi sessions can briefly desync between the payment record, booking row,
 * and flexi booking row if a webhook lands before the client verify call.
 * Treat any paid/waived source as effectively paid so member-facing surfaces
 * don't regress to "payment pending" after a successful checkout.
 */
export function resolveEffectiveSessionPaymentStatus(params: {
  sessionPaymentStatus?: SessionPaymentStatus;
  bookingPaymentStatus?: SessionPaymentStatus;
  paymentRecordStatus?: SessionPaymentStatus;
}): string {
  const sessionStatus = params.sessionPaymentStatus;
  if (isPaidLike(sessionStatus)) return sessionStatus!;

  const bookingStatus = params.bookingPaymentStatus;
  if (isPaidLike(bookingStatus)) return bookingStatus!;

  if (params.paymentRecordStatus === "paid") return "paid";

  return sessionStatus ?? bookingStatus ?? params.paymentRecordStatus ?? "pending";
}
