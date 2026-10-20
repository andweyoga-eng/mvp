import type { Booking, Class } from "@shared/schema";
import { canResumePaymentCheckout } from "@shared/booking-payment-hold";
import { generateGuestCheckoutToken } from "./auth";
import { getConfiguredCheckoutGateway } from "./payment-gateways";
import {
  normalizeSessionPaymentMethod,
  usesHostedCheckout,
} from "@shared/payment-gateway";
import { programHasFee, programPriceRupeesDisplay } from "./checkout-program";
import { storage } from "./storage";

/** Shared payload for guest conflict 409 and GET /api/bookings/:id/resume-checkout. */
export async function buildResumeCheckoutPayload(params: {
  booking: Booking;
  cls: Class;
  classType?: { name?: string | null; price?: string | null } | null;
  instructor?: { name?: string | null } | null;
}): Promise<Record<string, unknown>> {
  const { booking, cls, classType, instructor } = params;
  const resumeMethod = normalizeSessionPaymentMethod(
    booking.paymentMethod ?? cls.paymentMethod,
  );
  const resumeGateway = getConfiguredCheckoutGateway();

  let price: string | null = null;
  let resumeHasPrice = false;
  const sub = await storage.getSubscriptionByBookingId(booking.id);
  if (sub?.programId) {
    const program = await storage.getProgram(sub.programId);
    if (program) {
      price = programPriceRupeesDisplay(program);
      resumeHasPrice = programHasFee(program);
    }
  }
  if (!resumeHasPrice) {
    const payment = await storage.getPaymentByBookingId(booking.id);
    if (payment && payment.amountPaise > 0) {
      price = (payment.amountPaise / 100).toFixed(2);
      resumeHasPrice = true;
    }
  }
  // Last resort display only — never used for charging (FR-04).
  if (price == null && classType?.price) {
    price = String(classType.price);
  }

  const resumeCheckoutEnabled =
    resumeHasPrice && usesHostedCheckout(resumeMethod) && !!resumeGateway;

  const payload: Record<string, unknown> = {
    booking: {
      id: booking.id,
      classId: booking.classId,
      userId: booking.userId,
      createdAt: booking.createdAt,
      heldUntil: booking.heldUntil
        ? new Date(booking.heldUntil).toISOString()
        : null,
    },
    bookingId: booking.id,
    classId: cls.id,
    className: classType?.name ?? "Yoga Session",
    instructorName: instructor?.name ?? "",
    sessionDate: cls.date,
    price,
    programId: sub?.programId ?? null,
    useRazorpayCheckout: resumeCheckoutEnabled,
    razorpayKeyId: resumeCheckoutEnabled ? resumeGateway!.getPublicKeyId() : null,
    paymentRequired: resumeHasPrice,
    isGuestCheckout: booking.isGuestCheckout,
  };

  payload.heldUntil = booking.heldUntil
    ? new Date(booking.heldUntil).toISOString()
    : null;

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
