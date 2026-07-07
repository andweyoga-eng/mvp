import { storage } from "./storage";
import { razorpayInvoicePdfUrl, fetchRazorpayPayment, isRazorpayPaymentSuccessful } from "./razorpay";
import { getPaymentGateway } from "./payment-gateways";
import {
  normalizeSessionPaymentMethod,
  providerForSessionMethod,
  usesExternalPaymentLink,
  usesHostedCheckout,
  usesQrManualVerification,
  type PaymentDisposition,
  type PaymentProviderId,
} from "@shared/payment-gateway";
import { sendEmail, createSessionConfirmationEmailHTML } from "./email";
import {
  bookingContactEmail,
  bookingContactName,
} from "./booking-access";
function formatSessionPrice(price: string | number | null | undefined): string | null {
  if (price === null || price === undefined || price === "") return null;
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export interface PaymentSuccessPayload {
  bookingId: string;
  classId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
  googleMeetLink: string | null;
  price: string | number | null;
  paymentStatus: string;
  receiptUrl: string | null;
  invoiceUrl: string | null;
}

export async function markPaymentPaid(params: {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature?: string;
}): Promise<PaymentSuccessPayload | null> {
  const payment = await storage.getPaymentById(params.paymentId);
  if (!payment) return null;

  if (payment.status === "paid") {
    return buildPayloadFromPayment(payment);
  }

  const provider = (payment.gatewayProvider ?? "razorpay") as PaymentProviderId;
  const gateway = getPaymentGateway(provider);

  let signatureOk = !params.razorpaySignature;
  if (params.razorpaySignature && gateway) {
    signatureOk = gateway.verifyPayment({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });
  }

  if (!signatureOk && provider === "razorpay") {
    try {
      const remote = await fetchRazorpayPayment(params.razorpayPaymentId);
      const orderMatches =
        remote.order_id === params.razorpayOrderId ||
        remote.order_id === payment.razorpayOrderId;
      if (isRazorpayPaymentSuccessful(remote.status) && orderMatches) {
        signatureOk = true;
      }
    } catch (err) {
      console.error("[Payment] Razorpay status fallback failed:", err);
    }
  }

  if (params.razorpaySignature && !signatureOk) {
    throw new Error("Invalid payment signature");
  }

  let invoiceUrl: string | null = payment.invoiceUrl ?? null;
  let payerName = payment.payerName;
  let payerEmail = payment.payerEmail;
  let payerPhone = payment.payerPhone;
  let gatewayPaymentMethod = payment.gatewayPaymentMethod;
  let gatewayReference = payment.gatewayReference ?? params.razorpayPaymentId;

  if (gateway && provider === "razorpay") {
    try {
      const details = await gateway.fetchPaymentDetails(params.razorpayPaymentId);
      payerName = details.payerName ?? payerName;
      payerEmail = details.payerEmail ?? payerEmail;
      payerPhone = details.payerPhone ?? payerPhone;
      gatewayPaymentMethod = details.gatewayPaymentMethod ?? gatewayPaymentMethod;
      gatewayReference = details.gatewayReference;
      if (details.invoiceId) {
        invoiceUrl = razorpayInvoicePdfUrl(details.invoiceId);
      }
    } catch (err) {
      console.error("[Payment] Could not fetch gateway payment details:", err);
    }
  }

  const paidAt = new Date();
  const disposition: PaymentDisposition = "received";
  await storage.updatePayment(payment.id, {
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignature: params.razorpaySignature ?? payment.razorpaySignature,
    status: "paid",
    paidAt,
    payerName,
    payerEmail,
    payerPhone,
    gatewayPaymentMethod,
    gatewayReference,
    adminDisposition: disposition,
    invoiceUrl: invoiceUrl ?? payment.invoiceUrl,
    receiptUrl: `https://razorpay.com/payment/${params.razorpayPaymentId}`,
  });
  await storage.updateBookingPaymentHold(payment.bookingId, {
    paymentStatus: "paid",
    heldUntil: null,
  });

  if (payment.couponId && (payment.discountAmountPaise ?? 0) > 0) {
    const bookingForCoupon = await storage.getBooking(payment.bookingId);
    const clsForCoupon = await storage.getClass(payment.classId);
    if (bookingForCoupon && clsForCoupon) {
      await storage.finalizeCouponRedemption({
        couponId: payment.couponId,
        userId: bookingForCoupon.userId ?? null,
        bookingId: payment.bookingId,
        paymentId: payment.id,
        classTypeId: clsForCoupon.classTypeId,
        classId: clsForCoupon.id,
        originalAmountPaise: payment.originalAmountPaise ?? payment.amountPaise,
        discountAmountPaise: payment.discountAmountPaise ?? 0,
        finalAmountPaise: payment.amountPaise,
      });
    }
  }

  const updated = await storage.getPaymentById(payment.id);
  if (!updated) return null;

  const booking = await storage.getBooking(payment.bookingId);
  const user = booking?.userId
    ? await storage.getUser(booking.userId)
    : undefined;
  const cls = await storage.getClass(payment.classId);
  const classType = cls ? await storage.getClassType(cls.classTypeId) : undefined;
  const instructor = cls ? await storage.getInstructor(cls.instructorId) : undefined;

  const recipientEmail =
    user?.email ?? (booking ? bookingContactEmail(booking) : payment.payerEmail);
  const recipientName =
    user?.name ?? (booking ? bookingContactName(booking) : payment.payerName) ?? "there";

  if (recipientEmail && cls && classType) {
    const amountLabel = formatSessionPrice(classType.price);
    await sendEmail({
      to: recipientEmail,
      subject: `You're booked — ${classType.name} · andWeYoga`,
      html: createSessionConfirmationEmailHTML({
        name: recipientName,
        className: classType.name,
        sessionDate: cls.date.toISOString(),
        instructorName: instructor?.name ?? "your instructor",
        meetLink: cls.googleMeetLink,
        amountLabel,
      }),
    });
  }

  return buildPayloadFromPayment(updated, cls, classType, instructor);
}

async function sendBookingConfirmationEmail(bookingId: string): Promise<void> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) return;
  const user = booking.userId ? await storage.getUser(booking.userId) : undefined;
  const recipientEmail = user?.email ?? bookingContactEmail(booking);
  const recipientName = (user?.name ?? bookingContactName(booking)) || "there";
  const cls = await storage.getClass(booking.classId);
  const classType = cls ? await storage.getClassType(cls.classTypeId) : undefined;
  const instructor = cls ? await storage.getInstructor(cls.instructorId) : undefined;
  if (!recipientEmail || !cls || !classType) return;
  const amountLabel = formatSessionPrice(classType.price);
  await sendEmail({
    to: recipientEmail,
    subject: `Payment confirmed — ${classType.name} · andWeYoga`,
    html: createSessionConfirmationEmailHTML({
      name: recipientName,
      className: classType.name,
      sessionDate: cls.date.toISOString(),
      instructorName: instructor?.name ?? "your instructor",
      meetLink: cls.googleMeetLink,
      amountLabel,
    }),
  });
}

function resolveBookingPaymentMethod(
  booking: { paymentMethod: string | null; classId: string },
  cls: { paymentMethod: string } | undefined,
): ReturnType<typeof normalizeSessionPaymentMethod> {
  return normalizeSessionPaymentMethod(booking.paymentMethod ?? cls?.paymentMethod);
}

/** Admin verifies QR or payment-link transactions from Payment History. */
export async function verifyManualPayment(
  paymentId: string,
  disposition: PaymentDisposition,
): Promise<PaymentSuccessPayload> {
  const payment = await storage.getPaymentById(paymentId);
  if (!payment) throw new Error("Payment not found");

  const booking = await storage.getBooking(payment.bookingId);
  if (!booking) throw new Error("Booking not found");

  const cls = await storage.getClass(booking.classId);
  const method = resolveBookingPaymentMethod(booking, cls);
  const provider = (payment.gatewayProvider ??
    providerForSessionMethod(method)) as PaymentProviderId;

  if (provider === "razorpay" || usesHostedCheckout(method)) {
    throw new Error("Gateway payments are confirmed automatically and cannot be verified here");
  }

  if (booking.paymentStatus === "paid" && disposition === "received") {
    throw new Error("This booking is already marked as paid");
  }

  if (usesQrManualVerification(method) && disposition === "received") {
    const updated = await storage.confirmQrBooking(booking.id);
    if (!updated) throw new Error("Could not confirm booking payment");
    await sendBookingConfirmationEmail(booking.id);
    const refreshed = await storage.getPaymentById(payment.id);
    const payload = await buildPayloadFromPayment(refreshed, cls ?? undefined);
    if (!payload) throw new Error("Payment was confirmed but the record could not be loaded");
    return payload;
  }

  const paymentStatus =
    disposition === "received"
      ? "paid"
      : disposition === "failed"
        ? "failed"
        : "pending";

  await storage.updateBookingPaymentStatus(booking.id, paymentStatus);
  await storage.updatePayment(payment.id, {
    status: paymentStatus,
    adminDisposition: disposition,
    paidAt: disposition === "received" ? new Date() : payment.paidAt,
  });

  if (disposition === "received" && usesExternalPaymentLink(method)) {
    await sendBookingConfirmationEmail(booking.id);
  }

  const refreshed = await storage.getPaymentById(payment.id);
  const payload = await buildPayloadFromPayment(refreshed, cls ?? undefined);
  if (!payload) throw new Error("Payment was updated but the record could not be loaded");
  return payload;
}

/** Admin confirms manual QR payment — marks paid and emails member with Meet link. */
export async function confirmQrBookingPayment(bookingId: string): Promise<PaymentSuccessPayload | null> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) return null;
  const cls = await storage.getClass(booking.classId);
  if (resolveBookingPaymentMethod(booking, cls) !== "qr") return null;
  if (booking.paymentStatus === "paid") {
    throw new Error("Booking is already marked as paid");
  }
  if (booking.verificationStatus === "confirmed") {
    throw new Error("Booking payment was already verified");
  }

  const updated = await storage.confirmQrBooking(bookingId);
  if (!updated) return null;

  await sendBookingConfirmationEmail(booking.id);

  const payment = await storage.getPaymentByBookingId(bookingId);
  if (payment) {
    const payload = await buildPayloadFromPayment(payment, cls ?? undefined);
    if (payload) return payload;
  }

  const classType = cls ? await storage.getClassType(cls.classTypeId) : undefined;
  const instructor = cls ? await storage.getInstructor(cls.instructorId) : undefined;
  return {
    bookingId: updated.id,
    classId: updated.classId,
    className: classType?.name ?? "Yoga Session",
    instructorName: instructor?.name ?? "",
    sessionDate: cls?.date.toISOString() ?? new Date().toISOString(),
    googleMeetLink: cls?.googleMeetLink ?? null,
    price: classType?.price ?? null,
    paymentStatus: updated.paymentStatus,
    receiptUrl: null,
    invoiceUrl: null,
  };
}

async function buildPayloadFromPayment(
  payment: Awaited<ReturnType<typeof storage.getPaymentById>>,
  cls?: Awaited<ReturnType<typeof storage.getClass>>,
  classType?: Awaited<ReturnType<typeof storage.getClassType>>,
  instructor?: Awaited<ReturnType<typeof storage.getInstructor>>,
): Promise<PaymentSuccessPayload | null> {
  if (!payment) return null;
  const booking = await storage.getBooking(payment.bookingId);
  if (!booking) return null;
  const session = cls ?? (await storage.getClass(payment.classId));
  const type = classType ?? (session ? await storage.getClassType(session.classTypeId) : undefined);
  const teach = instructor ?? (session ? await storage.getInstructor(session.instructorId) : undefined);

  return {
    bookingId: payment.bookingId,
    classId: payment.classId,
    className: type?.name ?? "Yoga Session",
    instructorName: teach?.name ?? "",
    sessionDate: session?.date.toISOString() ?? new Date().toISOString(),
    googleMeetLink: session?.googleMeetLink ?? null,
    price: type?.price ?? null,
    paymentStatus: booking.paymentStatus,
    receiptUrl: payment.receiptUrl,
    invoiceUrl: payment.invoiceUrl,
  };
}

/** Returns success payload when webhook confirmed payment before client verify (e.g. UPI). */
export async function getPaidPaymentPayload(
  paymentId: string,
): Promise<PaymentSuccessPayload | null> {
  const payment = await storage.getPaymentById(paymentId);
  if (!payment || payment.status !== "paid") return null;
  return buildPayloadFromPayment(payment);
}
