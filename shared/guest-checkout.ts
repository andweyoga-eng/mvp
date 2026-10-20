/** Flip to true when SMS gateway is integrated (set SMS_GATEWAY_READY=true on server). */
export const SMS_GATEWAY_READY = false;

export function guestSessionDetailsMessage(): string {
  return SMS_GATEWAY_READY
    ? "Session details will be shared on your email and SMS."
    : "Session details will be shared on your email.";
}

export const GUEST_CHECKOUT_TOKEN_STORAGE_KEY = "guestCheckoutToken";
