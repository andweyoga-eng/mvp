import Razorpay from "razorpay";
import crypto from "crypto";

export type PaymentRecordStatus = "created" | "pending" | "paid" | "failed" | "refunded";

function getKeys(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getKeys() !== null;
}

export function getRazorpayKeyId(): string | null {
  return getKeys()?.keyId ?? null;
}

let client: Razorpay | null = null;

function getClient(): Razorpay {
  const keys = getKeys();
  if (!keys) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  if (!client) {
    client = new Razorpay({ key_id: keys.keyId, key_secret: keys.keySecret });
  }
  return client;
}

export function rupeesToPaise(amount: string | number): number {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid session price for payment");
  }
  return Math.round(n * 100);
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const rz = getClient();
  const order = await rz.orders.create({
    amount: params.amountPaise,
    currency: "INR",
    receipt: params.receipt.slice(0, 40),
    notes: params.notes,
  });
  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getKeys()?.keySecret;
  if (!secret) return false;
  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function fetchRazorpayPayment(paymentId: string): Promise<{
  status: string;
  order_id: string | null;
  invoice_id: string | null;
  error_description?: string;
  email?: string;
  contact?: string;
}> {
  const rz = getClient();
  const payment = await rz.payments.fetch(paymentId);
  return {
    status: payment.status,
    order_id: payment.order_id ?? null,
    invoice_id: payment.invoice_id ?? null,
    error_description: payment.error_description ?? undefined,
    email: payment.email ?? undefined,
    contact: payment.contact != null ? String(payment.contact) : undefined,
  };
}

export function isRazorpayPaymentSuccessful(status: string): boolean {
  return status === "captured" || status === "authorized";
}

/** Payer + reference fields for payment history (gateway-agnostic shape). */
export async function fetchRazorpayPaymentDetails(paymentId: string): Promise<{
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  gatewayPaymentMethod: string | null;
  gatewayReference: string;
  invoiceId: string | null;
}> {
  const rz = getClient();
  const payment = await rz.payments.fetch(paymentId);
  const contact = payment.contact ? String(payment.contact) : null;
  const email = payment.email ? String(payment.email) : null;
  const method =
    payment.method != null ? String(payment.method) : null;
  const notes = payment.notes as Record<string, string> | undefined;
  const payerName =
    (notes?.name && String(notes.name)) ||
    (payment as { card?: { name?: string } }).card?.name ||
    null;
  return {
    payerName,
    payerEmail: email,
    payerPhone: contact,
    gatewayPaymentMethod: method,
    gatewayReference: payment.id,
    invoiceId: payment.invoice_id ?? null,
  };
}

/** Razorpay invoice PDF URL when an invoice_id exists. */
export function razorpayInvoicePdfUrl(invoiceId: string): string {
  return `https://razorpay.com/invoice/${invoiceId}/pdf`;
}
