import { normalizeSessionPaymentMethod, usesHostedCheckout } from "./payment-gateway";

export type GuestBookingConflictState =
  | "none"
  | "processing"
  | "confirmed"
  | "failed";

export const GUEST_QR_VERIFICATION_TAT = "2 hours";
export const GUEST_RAZORPAY_VERIFICATION_TAT = "a few minutes";

export function guestBookingProcessingMessage(paymentMethod: string | null | undefined): string {
  const method = normalizeSessionPaymentMethod(paymentMethod);
  const tat = usesHostedCheckout(method)
    ? GUEST_RAZORPAY_VERIFICATION_TAT
    : GUEST_QR_VERIFICATION_TAT;
  return `Your booking for this session is currently being processed. Please check your email for confirmation. We typically respond within ${tat}.`;
}

export const GUEST_BOOKING_CONFIRMED_MESSAGE =
  "You are already booked for this session. Check your email for your session details and joining information.";

export const GUEST_BOOKING_FAILED_MESSAGE =
  "Your previous payment attempt for this session was unsuccessful. Please try again.";

export const GUEST_QR_SUBMITTED_MESSAGE =
  "Thank you. Our team will verify your payment and confirm your booking. Please check your email for updates.";

export const GUEST_QR_SIGNIN_PROMPT =
  "You can check the status and updates instantly by signing in or creating an account.";
