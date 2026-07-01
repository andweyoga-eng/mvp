import { normalizeSessionPaymentMethod, usesHostedCheckout } from "./payment-gateway";

export type GuestBookingConflictState =
  | "none"
  | "processing"
  | "confirmed"
  | "failed";

export const GUEST_QR_VERIFICATION_TAT = "15 minutes";
export const GUEST_RAZORPAY_VERIFICATION_TAT = "a few minutes";

/** Guest support WhatsApp (manual QR verification). */
export const GUEST_QR_SUPPORT_WHATSAPP = "9513022331";
export const GUEST_QR_SUPPORT_WHATSAPP_HREF = "https://wa.me/919513022331";

export function guestBookingProcessingMessage(paymentMethod: string | null | undefined): string {
  const method = normalizeSessionPaymentMethod(paymentMethod);
  const tat = usesHostedCheckout(method)
    ? GUEST_RAZORPAY_VERIFICATION_TAT
    : GUEST_QR_VERIFICATION_TAT;
  return `Your booking for this session is currently being processed. We will verify your payment within ${tat} and send session details by email and SMS. Please check your email for updates.`;
}

export const GUEST_BOOKING_CONFIRMED_MESSAGE =
  "You are already booked for this session. Check your email for your session details and joining information.";

export const GUEST_BOOKING_FAILED_MESSAGE =
  "Your previous payment attempt for this session was unsuccessful. Please try again.";

export const GUEST_QR_SUBMITTED_MESSAGE =
  "Thank you for your payment. Our team will verify it within 15 minutes and send your session details by email and SMS.";

export const GUEST_QR_SUBMITTED_ASSISTANCE_MESSAGE =
  "If you need any further assistance, reach out to us on WhatsApp.";

export const GUEST_QR_SIGNIN_PROMPT =
  "You can check the status and updates instantly by signing in or creating an account.";
