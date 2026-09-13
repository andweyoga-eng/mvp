/** Member- and guest-submitted payment reference (QR + payment link flows). */

import { CUSTOMER_SUPPORT } from "./support";

export const MANUAL_PAYMENT_REF_LENGTH = 4;

export const MANUAL_PAYMENT_VERIFICATION_TAT = "15 minutes";

export const MANUAL_PAYMENT_SUPPORT_WHATSAPP = CUSTOMER_SUPPORT.phoneLocal;
export const MANUAL_PAYMENT_SUPPORT_WHATSAPP_HREF = CUSTOMER_SUPPORT.whatsappHref;

export const MANUAL_PAYMENT_WORKING_HOURS = {
  daysLabel: CUSTOMER_SUPPORT.daysLabel,
  timeRangeLabel: CUSTOMER_SUPPORT.hoursShort,
  shortLabel: `${CUSTOMER_SUPPORT.daysLabel}, ${CUSTOMER_SUPPORT.hoursShort}`,
} as const;

export const MANUAL_PAYMENT_SUBMITTED_COPY = {
  headline: "Payment reference received",
  confirmation:
    "Thank you for your payment. Our team will verify it within 15 minutes and send your session details by email and SMS.",
  assistance: "If you need any further assistance, reach out to us on WhatsApp.",
  verificationTat: MANUAL_PAYMENT_VERIFICATION_TAT,
  /** @deprecated Use verificationTat */
  workingHoursTitle: "Verification hours",
  /** @deprecated Kept for API compatibility */
  workingHoursDetail: `${MANUAL_PAYMENT_WORKING_HOURS.daysLabel}, ${MANUAL_PAYMENT_WORKING_HOURS.timeRangeLabel}.`,
} as const;

export const MANUAL_PAYMENT_SUBMITTED_TOAST =
  `We'll verify your payment within ${MANUAL_PAYMENT_VERIFICATION_TAT} and send session details by email and SMS.`;

export const MANUAL_PAYMENT_REF_LABEL =
  "Last 4 characters of payment reference / payment ID";

export const MANUAL_PAYMENT_REF_HINT =
  "Enter exactly 4 characters from your UTR, transaction reference, or Razorpay payment ID.";

export function normalizeManualPaymentRefInput(value: string): string {
  return value.replace(/\s/g, "").slice(0, MANUAL_PAYMENT_REF_LENGTH);
}

export function isValidManualPaymentRef(value: string): boolean {
  const n = normalizeManualPaymentRefInput(value);
  return n.length === MANUAL_PAYMENT_REF_LENGTH && /^[A-Za-z0-9]{4}$/.test(n);
}
