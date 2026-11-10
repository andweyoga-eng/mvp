import { storage } from "./storage";
import {
  HERO_CTA_SETTING_KEY,
  HERO_SLIDE_WORDS,
  defaultHeroCtaConfig,
  parseHeroCtaConfig,
  heroCtaConfigSchema,
  shareHeroCta,
  shareHeroDisclaimer,
  type HeroCtaConfig,
  type HeroSlideCta,
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
  const byWord = new Map(parsed.slides.map((slide) => [slide.word, slide]));
  const ordered = HERO_SLIDE_WORDS.flatMap((word) => {
    const slide = byWord.get(word);
    return slide ? [cloneSlide(slide)] : [];
  });
  let slides = ordered;
  if (parsed.applySameLinkToAll && slides[0]) slides = shareHeroCta(slides, slides[0]);
  if (parsed.applySameDisclaimerToAll && slides[0]) {
    slides = shareHeroDisclaimer(slides, slides[0].disclaimer);
  }
  const normalized: HeroCtaConfig = {
    applySameLinkToAll: parsed.applySameLinkToAll,
    applySameDisclaimerToAll: parsed.applySameDisclaimerToAll,
    slides,
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
      oldValue: redactHeroImages(previous),
      newValue: redactHeroImages(normalized),
      adminId,
    }),
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return normalized;
}

function cloneSlide(slide: HeroSlideCta): HeroSlideCta {
  return {
    ...slide,
    phrases: slide.phrases.map((phrase) => ({ ...phrase })),
  };
}

function redactHeroImages(config: HeroCtaConfig): HeroCtaConfig {
  return {
    applySameLinkToAll: config.applySameLinkToAll,
    applySameDisclaimerToAll: config.applySameDisclaimerToAll,
    slides: config.slides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl ? `[image ${slide.imageUrl.length} chars]` : null,
    })),
  };
}

/** Seed missing hero CTA row (idempotent). */
export async function ensureDefaultHeroCtaConfig(): Promise<void> {
  const existing = await storage.getPlatformSetting(HERO_CTA_SETTING_KEY);
  if (!existing) {
    await storage.upsertPlatformSetting(HERO_CTA_SETTING_KEY, defaultHeroCtaConfig(), null);
  }
}
