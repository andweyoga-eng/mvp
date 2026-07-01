import type { Booking } from "@shared/schema";
import {
  BOOKING_PAYMENT_STATUS,
  formatHoldExpiryIst,
  holdExpiresAt,
} from "@shared/booking-payment-hold";
import { storage } from "./storage";
import { sendEmail } from "./email";
import { sendTransactionalSms } from "./msg91";
import { generateGuestCheckoutToken } from "./auth";
import { resolvePublicAppBaseUrl } from "./instructor-verification";

function buildPaymentRetryUrl(bookingId: string, guestToken: string): string {
  const base = resolvePublicAppBaseUrl();
  const params = new URLSearchParams({
    openBooking: "true",
    resumeBookingId: bookingId,
    guestCheckoutToken: guestToken,
  });
  return `${base}/?${params.toString()}`;
}

export function createPaymentHoldEmailHtml(params: {
  guestName: string;
  className: string;
  instructorName: string;
  sessionWhen: string;
  holdUntilIst: string;
  retryUrl: string;
}): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1b1c1b">
  <p>Hi ${params.guestName},</p>
  <p>Your payment for the following session could not be completed. We have held your spot for <strong>10 minutes</strong>.</p>
  <p style="background:#f8f6fc;border-radius:12px;padding:16px">
    <strong>${params.className}</strong><br/>
    with ${params.instructorName}<br/>
    ${params.sessionWhen}
  </p>
  <p><strong>Hold expires:</strong> ${params.holdUntilIst} (IST)</p>
  <p>After that time, your spot will be released for other members.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${params.retryUrl}" style="background:#34196a;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700">
      Retry payment
    </a>
  </p>
  <p style="font-size:13px;color:#666">If the button does not work, copy this link:<br/><a href="${params.retryUrl}">${params.retryUrl}</a></p>
</div>`;
}

/**
 * Gateway-initiated failure: set heldUntil (first failure only — never reset clock),
 * notify guest, optional SMS.
 */
export async function applyPaymentFailureHold(bookingId: string): Promise<Booking | undefined> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) return undefined;
  if (
    booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAID ||
    booking.paymentStatus === BOOKING_PAYMENT_STATUS.WAIVED ||
    booking.paymentStatus === BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER ||
    booking.paymentStatus === BOOKING_PAYMENT_STATUS.HOLD_EXPIRED
  ) {
    return booking;
  }

  const heldUntil = booking.heldUntil ? new Date(booking.heldUntil) : holdExpiresAt();
  const updated = await storage.updateBookingPaymentHold(bookingId, {
    heldUntil: heldUntil.toISOString(),
    paymentStatus: booking.heldUntil
      ? booking.paymentStatus
      : BOOKING_PAYMENT_STATUS.PENDING,
  });
  if (!updated) return undefined;

  const cls = await storage.getClass(booking.classId);
  const classType = cls ? await storage.getClassType(cls.classTypeId) : undefined;
  const instructor = cls ? await storage.getInstructor(cls.instructorId) : undefined;
  const guestEmail = booking.guestEmail?.trim();
  const guestName = booking.guestName?.trim() || "there";
  const guestPhone = booking.guestPhone?.trim();

  if (guestEmail && cls) {
    const guestToken = generateGuestCheckoutToken(booking.id);
    const retryUrl = buildPaymentRetryUrl(booking.id, guestToken);
    const holdUntilIst = formatHoldExpiryIst(heldUntil);
    const sessionWhen = new Date(cls.date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "short",
    });

    await sendEmail({
      to: guestEmail,
      subject: `Payment failed — your spot is held until ${holdUntilIst} (IST)`,
      html: createPaymentHoldEmailHtml({
        guestName,
        className: classType?.name ?? "Yoga session",
        instructorName: instructor?.name ?? "your instructor",
        sessionWhen,
        holdUntilIst,
        retryUrl,
      }),
    });

    if (guestPhone) {
      await sendTransactionalSms(
        guestPhone,
        `andWeYoga: Payment failed. Spot held until ${holdUntilIst} IST. Retry: ${retryUrl}`,
      );
    }
  }

  return updated;
}

/** Voluntary checkout exit — release spot immediately (SPEC-02). */
export async function cancelGuestCheckout(bookingId: string): Promise<Booking | undefined> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) return undefined;
  if (
    booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAID ||
    booking.paymentStatus === BOOKING_PAYMENT_STATUS.WAIVED
  ) {
    return booking;
  }

  const updated = await storage.updateBookingPaymentHold(bookingId, {
    paymentStatus: BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER,
    heldUntil: null,
  });
  if (updated) {
    await storage.syncClassBookingCount(booking.classId);
  }
  return updated;
}

/** Cron: expire holds past heldUntil. */
export async function expirePaymentHolds(): Promise<number> {
  const expired = await storage.findBookingsWithExpiredPaymentHold();
  let count = 0;
  for (const row of expired) {
    const updated = await storage.updateBookingPaymentHold(row.id, {
      paymentStatus: BOOKING_PAYMENT_STATUS.HOLD_EXPIRED,
      heldUntil: null,
    });
    if (updated) {
      await storage.syncClassBookingCount(row.classId);
      count += 1;
    }
  }
  return count;
}
