import type { Request, Response } from "express";
import { storage } from "./storage";
import { verifyWebhookSignature } from "./razorpay";
import { markPaymentPaid } from "./payment-service";

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

    res.json({ received: true });
  } catch (error) {
    console.error("[Razorpay webhook]", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
}
