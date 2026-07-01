/** Load Razorpay Checkout.js once per page. */
let scriptPromise: Promise<void> | null = null;

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
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });

  return scriptPromise;
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
  }) => void;
  onDismiss?: () => void;
  onPaymentFailed?: () => void;
  onModalOpen?: () => void;
}

export async function openRazorpayCheckout(params: RazorpayCheckoutParams): Promise<void> {
  await loadRazorpayScript();

  const options: Record<string, unknown> = {
    key: params.keyId,
    currency: params.currency || "INR",
    name: params.name,
    description: params.description,
    order_id: params.orderId,
    prefill: params.prefill,
    theme: { color: "#401e9c" },
    handler: params.onSuccess,
    modal: {
      ondismiss: params.onDismiss,
      escape: false,
      confirm_close: true,
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", () => {
    params.onPaymentFailed?.();
  });
  params.onModalOpen?.();
  rzp.open();
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}
