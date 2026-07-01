import type { Booking, Class } from "@shared/schema";
import { canResumePaymentCheckout } from "@shared/booking-payment-hold";
import { generateGuestCheckoutToken } from "./auth";
import { getConfiguredCheckoutGateway } from "./payment-gateways";
import {
  normalizeSessionPaymentMethod,
  usesHostedCheckout,
} from "@shared/payment-gateway";

/** Shared payload for guest conflict 409 and GET /api/bookings/:id/resume-checkout. */
export function buildResumeCheckoutPayload(params: {
  booking: Booking;
  cls: Class;
  classType?: { name?: string | null; price?: string | null } | null;
  instructor?: { name?: string | null } | null;
}): Record<string, unknown> {
  const { booking, cls, classType, instructor } = params;
  const resumeMethod = normalizeSessionPaymentMethod(
    booking.paymentMethod ?? cls.paymentMethod,
  );
  const resumeGateway = getConfiguredCheckoutGateway();
  const resumeHasPrice =
    classType?.price != null &&
    classType.price !== "" &&
    parseFloat(String(classType.price)) > 0;
  const resumeCheckoutEnabled =
    resumeHasPrice && usesHostedCheckout(resumeMethod) && !!resumeGateway;

  const payload: Record<string, unknown> = {
    booking: {
      id: booking.id,
      classId: booking.classId,
      userId: booking.userId,
      createdAt: booking.createdAt,
    },
    bookingId: booking.id,
    classId: cls.id,
    className: classType?.name ?? "Yoga Session",
    instructorName: instructor?.name ?? "",
    sessionDate: cls.date,
    price: classType?.price ?? null,
    useRazorpayCheckout: resumeCheckoutEnabled,
    razorpayKeyId: resumeCheckoutEnabled ? resumeGateway!.getPublicKeyId() : null,
    paymentRequired: resumeHasPrice,
    isGuestCheckout: booking.isGuestCheckout,
  };

  if (booking.isGuestCheckout) {
    payload.guestCheckoutToken = generateGuestCheckoutToken(booking.id);
    payload.guestName = booking.guestName?.trim() ?? "";
    payload.guestEmail = booking.guestEmail?.trim() ?? "";
    payload.guestPhone = booking.guestPhone?.trim() ?? "";
  }

  return payload;
}

export function bookingCanResumeCheckout(
  booking: Booking,
  cls: Class,
  mappingStatus?: string | null,
  nowMs?: number,
): boolean {
  return canResumePaymentCheckout({
    paymentStatus: booking.paymentStatus,
    heldUntil: booking.heldUntil,
    mappingStatus: mappingStatus ?? null,
    classSessionStartMs: new Date(cls.date).getTime(),
    nowMs,
  });
}
