/** Member-submitted payment reference (QR + payment link flows). */

export const MANUAL_PAYMENT_REF_LENGTH = 4;

export const MANUAL_PAYMENT_WORKING_HOURS = {
  daysLabel: "Every day of the week",
  timeRangeLabel: "6:00 AM – 9:00 PM IST",
  shortLabel: "Every day, 6:00 AM – 9:00 PM IST",
} as const;

export const MANUAL_PAYMENT_SUBMITTED_COPY = {
  headline: "Payment reference received",
  confirmation:
    "Our team will confirm your session within about 5 minutes after verifying your payment.",
  workingHoursTitle: "Verification hours",
  workingHoursDetail: `${MANUAL_PAYMENT_WORKING_HOURS.daysLabel}, ${MANUAL_PAYMENT_WORKING_HOURS.timeRangeLabel}.`,
} as const;

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
