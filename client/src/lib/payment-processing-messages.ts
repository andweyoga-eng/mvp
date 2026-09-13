/** Standard copy shown while a gateway payment is in progress — do not navigate away. */

export type PaymentProcessingPhase =
  | "creating-order"
  | "opening-checkout"
  | "checkout-open"
  | "verifying";

export const PAYMENT_PROCESSING_MESSAGES: Record<
  PaymentProcessingPhase,
  { title: string; description: string }
> = {
  "creating-order": {
    title: "Preparing secure checkout",
    description:
      "Please wait while we connect to the payment gateway. Do not close this window or use the back button.",
  },
  "opening-checkout": {
    title: "Opening payment window",
    description:
      "The Razorpay window will open shortly. Complete payment there and return here when finished.",
  },
  "checkout-open": {
    title: "Payment in progress",
    description:
      "Complete your payment in the Razorpay window. Do not close this page, press back, or refresh until you see confirmation here.",
  },
  verifying: {
    title: "Confirming your payment",
    description:
      "We are verifying your payment with the bank. Please wait. Do not close this page until confirmation appears.",
  },
};

export const PAYMENT_PROCESSING_FOOTER =
  "This usually takes under a minute. If the payment window closed accidentally, use Retry payment below.";
