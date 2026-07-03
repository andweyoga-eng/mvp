import { storage } from "./storage";
import {
  GUEST_CHECKOUT_SETTING_KEY,
  parseGuestCheckoutEnabled,
} from "@shared/platform-settings";

const CACHE_TTL_MS = 30_000;

let guestCheckoutCache: { value: boolean; expiresAt: number } | null = null;

/** Bust in-memory cache (writes and tests). */
export function bustGuestCheckoutCache(): void {
  guestCheckoutCache = null;
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

export async function listPlatformSettings() {
  return storage.getAllPlatformSettings();
}
