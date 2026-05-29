import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import type { MemberSession } from "@/lib/member-sessions";

export function canRetrySessionPayment(
  session: Pick<MemberSession, "status" | "paymentStatus">,
): boolean {
  return session.status === "upcoming" && session.paymentStatus === "pending";
}

export function paymentRetryCreateOrderBody(bookingId: string) {
  return { bookingId };
}

export function paymentRetryVerifyBody(
  paymentId: string,
  rzp: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
) {
  return {
    paymentId,
    razorpay_order_id: rzp.razorpay_order_id,
    razorpay_payment_id: rzp.razorpay_payment_id,
    razorpay_signature: rzp.razorpay_signature,
  };
}

export type PaymentRetryCallbacks = {
  onPaid: () => void | Promise<void>;
  onDismiss: () => void;
  onError: (message: string) => void;
};

export type PaymentRetryDeps = PaymentRetryCallbacks & {
  fetch: typeof fetch;
  openRazorpayCheckout: typeof openRazorpayCheckout;
  getAuthHeaders: () => Record<string, string>;
  readResponseJson: typeof readResponseJson;
};

export async function retrySessionPayment(
  session: Pick<MemberSession, "bookingId" | "className">,
  deps: PaymentRetryDeps,
): Promise<void> {
  try {
    const orderRes = await deps.fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...deps.getAuthHeaders() },
      credentials: "include",
      body: JSON.stringify(paymentRetryCreateOrderBody(session.bookingId)),
    });
    const orderData = await deps.readResponseJson<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      paymentId: string;
      message?: string;
    }>(orderRes);
    if (!orderRes.ok) {
      throw new Error(orderData.message || "Could not start payment retry.");
    }

    await deps.openRazorpayCheckout({
      keyId: orderData.keyId,
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "andWeYoga",
      description: session.className,
      onSuccess: async (rzp) => {
        const verifyRes = await deps.fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...deps.getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify(paymentRetryVerifyBody(orderData.paymentId, rzp)),
        });
        const verified = await deps.readResponseJson<{ success?: boolean; message?: string }>(
          verifyRes,
        );
        if (!verifyRes.ok || !verified.success) {
          throw new Error(verified.message || "Payment verification failed.");
        }
        await deps.onPaid();
      },
      onDismiss: deps.onDismiss,
    });
  } catch (error) {
    deps.onError(error instanceof Error ? error.message : "Please try again.");
  }
}

/** `fetch` must not be passed bare — `deps.fetch(url)` loses `this` and throws Illegal invocation. */
export function bindFetch(): typeof fetch {
  return (input, init) => globalThis.fetch(input, init);
}

export function defaultPaymentRetryDeps(
  callbacks: PaymentRetryCallbacks,
): PaymentRetryDeps {
  return {
    fetch: bindFetch(),
    openRazorpayCheckout,
    getAuthHeaders,
    readResponseJson,
    ...callbacks,
  };
}
