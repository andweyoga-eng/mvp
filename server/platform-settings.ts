import { storage } from "./storage";
import {
  GUEST_CHECKOUT_SETTING_KEY,
  MAINTENANCE_WINDOW_SETTING_KEY,
  FEATURE_GATE_SETTING_KEYS,
  FEATURE_GATE_DEFAULTS,
  type FeatureGateSettingKey,
  type PlatformSettingKey,
  parseGuestCheckoutEnabled,
  parseMaintenanceWindowEnabled,
  parseFeatureGateEnabled,
  isFeatureGateSettingKey,
} from "@shared/platform-settings";
import { notifyMaintenanceWindowEnabled } from "./maintenance-notify-service";

const CACHE_TTL_MS = 30_000;

let guestCheckoutCache: { value: boolean; expiresAt: number } | null = null;
let maintenanceWindowCache: { value: boolean; expiresAt: number } | null = null;
const featureGateCache = new Map<FeatureGateSettingKey, { value: boolean; expiresAt: number }>();

/** Bust in-memory cache (writes and tests). */
export function bustGuestCheckoutCache(): void {
  guestCheckoutCache = null;
}

/** Bust in-memory cache (writes and tests). */
export function bustMaintenanceWindowCache(): void {
  maintenanceWindowCache = null;
}

export function bustFeatureGateCache(key?: FeatureGateSettingKey): void {
  if (key) featureGateCache.delete(key);
  else featureGateCache.clear();
}

/**
 * Whether guest checkout is enabled. Missing row fails open (true) so a patch
 * not yet applied does not silently disable revenue.
 */
export async function getGuestCheckoutEnabled(): Promise<boolean> {
  const now = Date.now();
  if (guestCheckoutCache && guestCheckoutCache.expiresAt > now) {
    return guestCheckoutCache.value;
  }

  const row = await storage.getPlatformSetting(GUEST_CHECKOUT_SETTING_KEY);
  const value = row ? parseGuestCheckoutEnabled(row.value) : true;

  guestCheckoutCache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export async function setGuestCheckoutEnabled(
  enabled: boolean,
  adminId: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<boolean> {
  const previous = await getGuestCheckoutEnabled();
  await storage.upsertPlatformSetting(GUEST_CHECKOUT_SETTING_KEY, enabled, adminId);
  bustGuestCheckoutCache();

  await storage.insertAuditLog({
    userId: adminId,
    action: "platform_setting_changed",
    resourceType: "platform_setting",
    resourceId: GUEST_CHECKOUT_SETTING_KEY,
    metadata: JSON.stringify({
      key: GUEST_CHECKOUT_SETTING_KEY,
      oldValue: previous,
      newValue: enabled,
      adminId,
    }),
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return enabled;
}

/**
 * Whether the public member web app shows the maintenance overlay.
 * Missing row fails closed (false).
 */
export async function getMaintenanceWindowEnabled(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceWindowCache && maintenanceWindowCache.expiresAt > now) {
    return maintenanceWindowCache.value;
  }

  const row = await storage.getPlatformSetting(MAINTENANCE_WINDOW_SETTING_KEY);
  const value = row ? parseMaintenanceWindowEnabled(row.value) : false;

  maintenanceWindowCache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export async function setMaintenanceWindowEnabled(
  enabled: boolean,
  adminId: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<boolean> {
  const previous = await getMaintenanceWindowEnabled();
  await storage.upsertPlatformSetting(MAINTENANCE_WINDOW_SETTING_KEY, enabled, adminId);
  bustMaintenanceWindowCache();

  await storage.insertAuditLog({
    userId: adminId,
    action: "platform_setting_changed",
    resourceType: "platform_setting",
    resourceId: MAINTENANCE_WINDOW_SETTING_KEY,
    metadata: JSON.stringify({
      key: MAINTENANCE_WINDOW_SETTING_KEY,
      oldValue: previous,
      newValue: enabled,
      adminId,
    }),
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  if (enabled && !previous) {
    void notifyMaintenanceWindowEnabled().catch((err) => {
      console.error("[maintenance-notify] Failed to notify members:", err);
    });
  }

  return enabled;
}

/**
 * Product feature gate. Missing row fails open to the documented default (usually true)
 * so a missing seed does not blank the launcher.
 */
export async function getFeatureGateEnabled(key: FeatureGateSettingKey): Promise<boolean> {
  const now = Date.now();
  const cached = featureGateCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const row = await storage.getPlatformSetting(key);
  const fallback = FEATURE_GATE_DEFAULTS[key];
  const value = row ? parseFeatureGateEnabled(row.value) : fallback;

  featureGateCache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

export async function setFeatureGateEnabled(
  key: FeatureGateSettingKey,
  enabled: boolean,
  adminId: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<boolean> {
  const previous = await getFeatureGateEnabled(key);
  await storage.upsertPlatformSetting(key, enabled, adminId);
  bustFeatureGateCache(key);

  await storage.insertAuditLog({
    userId: adminId,
    action: "platform_setting_changed",
    resourceType: "platform_setting",
    resourceId: key,
    metadata: JSON.stringify({
      key,
      oldValue: previous,
      newValue: enabled,
      adminId,
    }),
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return enabled;
}

export async function getAllFeatureGates(): Promise<Record<FeatureGateSettingKey, boolean>> {
  const out = { ...FEATURE_GATE_DEFAULTS };
  await Promise.all(
    FEATURE_GATE_SETTING_KEYS.map(async (key) => {
      out[key] = await getFeatureGateEnabled(key);
    }),
  );
  return out;
}

export async function listPlatformSettings() {
  return storage.getAllPlatformSettings();
}

/** Seed missing platform_settings rows (idempotent — safe on every startup). */
export async function ensureDefaultPlatformSettings(): Promise<void> {
  const defaults: Array<{ key: string; value: boolean }> = [
    { key: GUEST_CHECKOUT_SETTING_KEY, value: false },
    { key: MAINTENANCE_WINDOW_SETTING_KEY, value: false },
    ...FEATURE_GATE_SETTING_KEYS.map((key) => ({
      key,
      value: FEATURE_GATE_DEFAULTS[key],
    })),
  ];

  for (const { key, value } of defaults) {
    const existing = await storage.getPlatformSetting(key);
    if (!existing) {
      await storage.upsertPlatformSetting(key, value, null);
    }
  }
}

export async function setPlatformSettingByKey(
  key: string,
  enabled: boolean,
  adminId: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<boolean> {
  if (key === GUEST_CHECKOUT_SETTING_KEY) {
    return setGuestCheckoutEnabled(enabled, adminId, meta);
  }
  if (key === MAINTENANCE_WINDOW_SETTING_KEY) {
    return setMaintenanceWindowEnabled(enabled, adminId, meta);
  }
  if (isFeatureGateSettingKey(key)) {
    return setFeatureGateEnabled(key, enabled, adminId, meta);
  }
  throw new Error(`Unknown platform setting key: ${key}`);
}

export type { PlatformSettingKey, FeatureGateSettingKey };
