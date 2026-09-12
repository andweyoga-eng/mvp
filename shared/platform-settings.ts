/** platform_settings row key — guest checkout without a member account (SPEC-GG-01). */
export const GUEST_CHECKOUT_SETTING_KEY = "guest_checkout_enabled";

/** platform_settings row key — maintenance overlay for public member web app. */
export const MAINTENANCE_WINDOW_SETTING_KEY = "maintenance_window_enabled";

export function parseGuestCheckoutEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  return false;
}

export function parseMaintenanceWindowEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  return false;
}
