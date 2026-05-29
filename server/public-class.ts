import type { Class, ClassType, Instructor } from "@shared/schema";
import { normalizeSessionPaymentMethod } from "@shared/payment-gateway";

/** Published (or scheduled and live) sessions members can book. */
export function isClassVisibleForBooking(
  cls: Pick<Class, "status" | "publishedAt" | "pausedAt" | "cancelledAt">,
  now: Date = new Date(),
): boolean {
  if (cls.cancelledAt) return false;
  if (cls.pausedAt) return false;
  if (cls.status === "published") return true;
  if (
    cls.status === "scheduled" &&
    cls.publishedAt &&
    new Date(cls.publishedAt).getTime() <= now.getTime()
  ) {
    return true;
  }
  return false;
}

/** Strip sensitive session fields from public API responses. */
export function sanitizePublicClass<T extends Class>(
  cls: T,
  extras?: { classType?: ClassType; instructor?: Instructor },
) {
  const {
    googleMeetLink: _meet,
    razorpayLink: _rzp,
    paymentQrCodeId: _qrId,
    qrContactPhone: _phone,
    qrContactEmail: _email,
    ...safe
  } = cls;
  const paymentMethod = normalizeSessionPaymentMethod(cls.paymentMethod);
  return {
    ...safe,
    ...extras,
    paymentMethod,
    hasPaymentConfigured:
      paymentMethod === "qr"
        ? !!cls.paymentQrCodeId
        : paymentMethod === "razorpay_link"
          ? !!cls.razorpayLink?.trim()
          : paymentMethod === "razorpay_gateway",
  };
}
