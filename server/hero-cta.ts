import { storage } from "./storage";
import {
  HERO_CTA_SETTING_KEY,
  defaultHeroCtaConfig,
  parseHeroCtaConfig,
  heroCtaConfigSchema,
  type HeroCtaConfig,
} from "@shared/hero-cta";

const CACHE_TTL_MS = 30_000;

let cache: { value: HeroCtaConfig; expiresAt: number } | null = null;

export function bustHeroCtaCache(): void {
  cache = null;
}

export async function getHeroCtaConfig(): Promise<HeroCtaConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  const row = await storage.getPlatformSetting(HERO_CTA_SETTING_KEY);
  const value = row ? parseHeroCtaConfig(row.value) : defaultHeroCtaConfig();
  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export async function setHeroCtaConfig(
  input: unknown,
  adminId: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<HeroCtaConfig> {
  const parsed = heroCtaConfigSchema.parse(input);
  const normalized: HeroCtaConfig = parsed.applySameLinkToAll
    ? {
        applySameLinkToAll: true,
        slides: parsed.slides.map(() => ({ ...parsed.slides[0]! })),
      }
    : {
        applySameLinkToAll: false,
        slides: parsed.slides.map((s) => ({ ...s })),
      };

  const previous = await getHeroCtaConfig();
  await storage.upsertPlatformSetting(HERO_CTA_SETTING_KEY, normalized, adminId);
  bustHeroCtaCache();

  await storage.insertAuditLog({
    userId: adminId,
    action: "platform_setting_changed",
    resourceType: "platform_setting",
    resourceId: HERO_CTA_SETTING_KEY,
    metadata: JSON.stringify({
      key: HERO_CTA_SETTING_KEY,
      oldValue: previous,
      newValue: normalized,
      adminId,
    }),
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return normalized;
}

/** Seed missing hero CTA row (idempotent). */
export async function ensureDefaultHeroCtaConfig(): Promise<void> {
  const existing = await storage.getPlatformSetting(HERO_CTA_SETTING_KEY);
  if (!existing) {
    await storage.upsertPlatformSetting(HERO_CTA_SETTING_KEY, defaultHeroCtaConfig(), null);
  }
}
