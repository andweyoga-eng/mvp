import type { Class, ClassType, Instructor } from "@shared/schema";
import { normalizeSessionPaymentMethod } from "@shared/payment-gateway";

export { isClassVisibleForBooking } from "@shared/class-visibility";
export type { ClassVisibilityFields } from "@shared/class-visibility";

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
