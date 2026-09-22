/** platform_settings row key — guest checkout without a member account (SPEC-GG-01). */
export const GUEST_CHECKOUT_SETTING_KEY = "guest_checkout_enabled";

/** platform_settings row key — maintenance overlay for public member web app. */
export const MAINTENANCE_WINDOW_SETTING_KEY = "maintenance_window_enabled";

/** SPEC-PLATFORM-FEATURE-GATES-01 — exclusive atomic product gates. */
export const FEATURE_WEDIET_VISIBLE_KEY = "feature_wediet_visible";
export const FEATURE_WEDIET_INTERACTIVE_KEY = "feature_wediet_interactive";
export const FEATURE_WEEMO_VISIBLE_KEY = "feature_weemo_visible";
export const FEATURE_WEEMO_INTERACTIVE_KEY = "feature_weemo_interactive";
export const FEATURE_WEBUILD_VISIBLE_KEY = "feature_webuild_visible";
export const FEATURE_WEBUILD_INTERACTIVE_KEY = "feature_webuild_interactive";
export const FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY = "feature_andweyoga_always_available";

export const FEATURE_GATE_SETTING_KEYS = [
  FEATURE_WEDIET_VISIBLE_KEY,
  FEATURE_WEDIET_INTERACTIVE_KEY,
  FEATURE_WEEMO_VISIBLE_KEY,
  FEATURE_WEEMO_INTERACTIVE_KEY,
  FEATURE_WEBUILD_VISIBLE_KEY,
  FEATURE_WEBUILD_INTERACTIVE_KEY,
  FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY,
] as const;

export type FeatureGateSettingKey = (typeof FEATURE_GATE_SETTING_KEYS)[number];

/** Full allowlist for PATCH /api/admin/platform-settings. */
export const PLATFORM_SETTING_KEYS = [
  GUEST_CHECKOUT_SETTING_KEY,
  MAINTENANCE_WINDOW_SETTING_KEY,
  ...FEATURE_GATE_SETTING_KEYS,
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

/** Strict boolean parse — unknown values fail closed to `fallback`. */
export function parsePlatformBoolean(value: unknown, fallback = false): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function parseGuestCheckoutEnabled(value: unknown): boolean {
  return parsePlatformBoolean(value, false);
}

export function parseMaintenanceWindowEnabled(value: unknown): boolean {
  return parsePlatformBoolean(value, false);
}

/** Feature gates default ON when row missing (fail open to current product surface). */
export function parseFeatureGateEnabled(value: unknown): boolean {
  return parsePlatformBoolean(value, true);
}

export const FEATURE_GATE_DEFAULTS: Record<FeatureGateSettingKey, boolean> = {
  [FEATURE_WEDIET_VISIBLE_KEY]: true,
  [FEATURE_WEDIET_INTERACTIVE_KEY]: true,
  [FEATURE_WEEMO_VISIBLE_KEY]: true,
  [FEATURE_WEEMO_INTERACTIVE_KEY]: true,
  [FEATURE_WEBUILD_VISIBLE_KEY]: true,
  [FEATURE_WEBUILD_INTERACTIVE_KEY]: true,
  [FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY]: true,
};

export function isPlatformSettingKey(key: string): key is PlatformSettingKey {
  return (PLATFORM_SETTING_KEYS as readonly string[]).includes(key);
}

export function isFeatureGateSettingKey(key: string): key is FeatureGateSettingKey {
  return (FEATURE_GATE_SETTING_KEYS as readonly string[]).includes(key);
}

/** Program feature-tab ids (store-only until entitlement ships). */
export const PROGRAM_FEATURE_TABS = ["wediet", "weemo", "webuild", "andweyoga"] as const;
export type ProgramFeatureTab = (typeof PROGRAM_FEATURE_TABS)[number];
