import { normalizeSessionPaymentMethod, usesHostedCheckout } from "./payment-gateway";
import {
  MANUAL_PAYMENT_SUBMITTED_COPY,
  MANUAL_PAYMENT_SUPPORT_WHATSAPP,
  MANUAL_PAYMENT_SUPPORT_WHATSAPP_HREF,
  MANUAL_PAYMENT_VERIFICATION_TAT,
} from "./manual-payment-ack";

export type GuestBookingConflictState =
  | "none"
  | "processing"
  | "confirmed"
  | "failed";

export const GUEST_QR_VERIFICATION_TAT = MANUAL_PAYMENT_VERIFICATION_TAT;
export const GUEST_RAZORPAY_VERIFICATION_TAT = "a few minutes";

export const GUEST_QR_SUPPORT_WHATSAPP = MANUAL_PAYMENT_SUPPORT_WHATSAPP;
export const GUEST_QR_SUPPORT_WHATSAPP_HREF = MANUAL_PAYMENT_SUPPORT_WHATSAPP_HREF;

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

export const GUEST_QR_SUBMITTED_MESSAGE = MANUAL_PAYMENT_SUBMITTED_COPY.confirmation;

export const GUEST_QR_SUBMITTED_ASSISTANCE_MESSAGE = MANUAL_PAYMENT_SUBMITTED_COPY.assistance;

export const GUEST_QR_SIGNIN_PROMPT =
  "You can check the status and updates instantly by signing in or creating an account.";
