import type { Request, Response } from "express";
import { storage } from "./storage";
import { verifyWebhookSignature } from "./razorpay";
import { markPaymentPaid } from "./payment-service";
import { applyPaymentFailureHold } from "./booking-hold-service";

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  if (!signature) {
    res.status(400).json({ message: "Missing signature" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ message: "Invalid webhook body" });
    return;
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    res.status(400).json({ message: "Invalid webhook signature" });
    return;
  }

  try {
    const event = JSON.parse(rawBody.toString("utf8"));
    const eventType = event.event as string;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity =
        event.payload?.payment?.entity ?? event.payload?.payment;
      const orderId = paymentEntity?.order_id as string | undefined;
      const paymentId = paymentEntity?.id as string | undefined;

      if (orderId && paymentId) {
        const record = await storage.getPaymentByRazorpayOrderId(orderId);
        if (record && record.status !== "paid") {
          await markPaymentPaid({
            paymentId: record.id,
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
          });
        }
      }
    }

    if (eventType === "payment.failed") {
      const paymentEntity =
        event.payload?.payment?.entity ?? event.payload?.payment;
      const orderId = paymentEntity?.order_id as string | undefined;

      if (orderId) {
        const record = await storage.getPaymentByRazorpayOrderId(orderId);
        if (record?.bookingId) {
          await applyPaymentFailureHold(record.bookingId);
        }
      }
    }

    if (eventType === "refund.processed" || eventType === "refund.failed") {
      const { markRefundProcessed } = await import("./refund-service");
      const refundEntity = event.payload?.refund?.entity ?? event.payload?.refund;
      const paymentEntity = event.payload?.payment?.entity ?? event.payload?.payment;
      if (eventType === "refund.processed") {
        await markRefundProcessed({
          razorpayRefundId: refundEntity?.id ? String(refundEntity.id) : null,
          razorpayPaymentId: paymentEntity?.id
            ? String(paymentEntity.id)
            : refundEntity?.payment_id
              ? String(refundEntity.payment_id)
              : null,
        });
      } else if (refundEntity?.id) {
        const { payments } = await import("@shared/schema");
        const { db } = await import("./db");
        const { eq } = await import("drizzle-orm");
        await db
          .update(payments)
          .set({
            refundStatus: "manual_required",
            updatedAt: new Date(),
          })
          .where(eq(payments.razorpayRefundId, String(refundEntity.id)));
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Razorpay webhook]", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
}
