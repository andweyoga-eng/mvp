/**
 * Gateway-agnostic payment types. Razorpay is the first provider; add others
 * by implementing PaymentGatewayAdapter in server/payment-gateways/.
 */

/** How a session collects payment (stored on classes + bookings). */
export type SessionPaymentMethod =
  | "razorpay_link"
  | "razorpay_gateway"
  | "qr";

/** Provider that processed or will process a transaction row. */
export type PaymentProviderId = "razorpay" | "manual_qr" | "manual_link";

/** Admin / member-facing disposition (filter UI is future scope). */
export type PaymentDisposition = "pending" | "received" | "failed" | "dispute";

export const PAYMENT_DISPOSITION_LABELS: Record<PaymentDisposition, string> = {
  pending: "Pending",
  received: "Received",
  failed: "Failed",
  dispute: "Dispute",
};

const SESSION_METHODS: SessionPaymentMethod[] = [
  "razorpay_link",
  "razorpay_gateway",
  "qr",
];

/** Legacy rows used payment_method = 'razorpay' for payment links. */
export function normalizeSessionPaymentMethod(
  value: string | null | undefined,
): SessionPaymentMethod {
  if (value === "razorpay_gateway" || value === "razorpay_link" || value === "qr") {
    return value;
  }
  if (value === "razorpay") return "razorpay_link";
  return "razorpay_link";
}

export function isSessionPaymentMethod(value: string): value is SessionPaymentMethod {
  return SESSION_METHODS.includes(value as SessionPaymentMethod);
}

export function usesHostedCheckout(method: SessionPaymentMethod): boolean {
  return method === "razorpay_gateway";
}

export function usesExternalPaymentLink(method: SessionPaymentMethod): boolean {
  return method === "razorpay_link";
}

export function usesQrManualVerification(method: SessionPaymentMethod): boolean {
  return method === "qr";
}

export function providerForSessionMethod(method: SessionPaymentMethod): PaymentProviderId {
  if (method === "qr") return "manual_qr";
  if (method === "razorpay_link") return "manual_link";
  return "razorpay";
}

/** Map technical payment.status → default admin disposition. */
export function dispositionFromPaymentStatus(
  status: string | null | undefined,
): PaymentDisposition {
  switch (status) {
    case "paid":
      return "received";
    case "failed":
      return "failed";
    case "refunded":
      return "dispute";
    default:
      return "pending";
  }
}

export function isAutomatedGatewayCapture(
  paymentMethod: string | null | undefined,
  gatewayProvider?: string | null,
): boolean {
  if (gatewayProvider === "razorpay") return true;
  return normalizeSessionPaymentMethod(paymentMethod) === "razorpay_gateway";
}

/** @deprecated Use isAutomatedGatewayCapture */
export function isAutomatedGatewayMethod(
  paymentMethod: string | null | undefined,
): boolean {
  return isAutomatedGatewayCapture(paymentMethod);
}

export function isManualVerificationMethod(
  paymentMethod: string | null | undefined,
  gatewayProvider?: string | null,
): boolean {
  if (gatewayProvider === "manual_qr" || gatewayProvider === "manual_link") return true;
  if (gatewayProvider === "razorpay") return false;
  const method = normalizeSessionPaymentMethod(paymentMethod);
  return usesQrManualVerification(method) || usesExternalPaymentLink(method);
}

/** Member-facing / admin label for gateway-captured payment.status */
export function formatGatewayPaymentStatus(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "pending":
      return "Pending";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  }
}

/** Final label for manually verified payments (QR, payment link). */
export function formatManualPaymentStatus(
  adminDisposition: PaymentDisposition | string,
  paymentStatus: string | null | undefined,
): string {
  const d = adminDisposition as PaymentDisposition;
  if (d === "received" || paymentStatus === "paid") return "Received";
  if (d === "failed" || paymentStatus === "failed") return "Failed";
  if (d === "dispute") return "Dispute";
  return PAYMENT_DISPOSITION_LABELS.pending;
}

export function isManualPaymentSettled(row: {
  status: string;
  adminDisposition: PaymentDisposition | string;
  bookingPaymentStatus?: string | null;
}): boolean {
  const paid =
    row.bookingPaymentStatus === "paid" ||
    row.bookingPaymentStatus === "waived" ||
    row.status === "paid";
  return paid && row.adminDisposition === "received";
}

export function requiresAdminVerification(row: {
  paymentMethod: string | null | undefined;
  gatewayProvider?: string | null;
  status: string;
  adminDisposition: PaymentDisposition | string;
  bookingPaymentStatus?: string | null;
  verificationStatus?: string | null;
  transactionAckNumber?: string | null;
}): boolean {
  if (isAutomatedGatewayCapture(row.paymentMethod, row.gatewayProvider)) return false;
  if (!isManualVerificationMethod(row.paymentMethod, row.gatewayProvider)) return false;
  const hasManualSubmission =
    row.verificationStatus === "pending" || !!row.transactionAckNumber?.trim();
  if (!hasManualSubmission) return false;
  return !isManualPaymentSettled(row);
}
