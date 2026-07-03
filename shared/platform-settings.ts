/** platform_settings row key — guest checkout without a member account (SPEC-GG-01). */
export const GUEST_CHECKOUT_SETTING_KEY = "guest_checkout_enabled";

export function parseGuestCheckoutEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  return false;
}
