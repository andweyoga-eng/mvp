import { RAZORPAY_CHECKOUT_TIMEOUT_SECONDS } from "@shared/booking-payment-hold";

/** Load Razorpay Checkout.js once per page. */
let scriptPromise: Promise<void> | null = null;

function assertRazorpayReady(): void {
  if (typeof window.Razorpay !== "function") {
    throw new Error(
      "Razorpay checkout could not load. Disable ad blockers for this site and try again.",
    );
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is only available in the browser"));
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (typeof window.Razorpay === "function") {
        resolve();
        return;
      }
      scriptPromise = null;
      reject(
        new Error(
          "Razorpay checkout loaded but did not initialize. Check your network or ad blocker.",
        ),
      );
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout. Check your network connection."));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

/** Razorpay prefill.contact expects a 10-digit Indian mobile when provided. */
export function normalizeRazorpayContact(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return undefined;
}

export interface RazorpayCheckoutParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  onDismiss?: () => void;
  onPaymentFailed?: () => void;
  onModalOpen?: () => void;
}

export async function openRazorpayCheckout(params: RazorpayCheckoutParams): Promise<void> {
  if (!params.keyId?.trim()) {
    throw new Error("Payment gateway is not configured. Please contact support.");
  }
  if (!params.orderId?.trim()) {
    throw new Error("Could not start payment — order reference is missing.");
  }

  await loadRazorpayScript();
  assertRazorpayReady();

  const prefill = params.prefill
    ? {
        ...params.prefill,
        contact: normalizeRazorpayContact(params.prefill.contact),
      }
    : undefined;

  const options: Record<string, unknown> = {
    key: params.keyId.trim(),
    currency: params.currency || "INR",
    name: params.name,
    description: params.description,
    order_id: params.orderId,
    prefill,
    timeout: RAZORPAY_CHECKOUT_TIMEOUT_SECONDS,
    theme: { color: "#401e9c" },
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      void Promise.resolve(params.onSuccess(response)).catch((err) => {
        console.error("[Razorpay] Payment success handler failed:", err);
      });
    },
    modal: {
      ondismiss: params.onDismiss,
      escape: false,
      confirm_close: true,
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => {
      params.onPaymentFailed?.();
    });
    params.onModalOpen?.();
    rzp.open();
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Could not open the Razorpay payment window. Please try again.",
    );
  }
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}
