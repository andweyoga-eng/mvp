import { z } from "zod";

/** Matches the home hero carousel slide order / words. */
export const HERO_SLIDE_WORDS = [
  "Embrace",
  "Experience",
  "Express",
  "Evolve",
  "Elevate",
  "Become",
] as const;

export type HeroSlideWord = (typeof HERO_SLIDE_WORDS)[number];

export const HERO_CTA_SETTING_KEY = "hero_cta_config";

/** Home-page section ids offered in the GTM section picker. */
export const HERO_CTA_HOME_SECTIONS = [
  { id: "teach", label: "and We Workout (teach)" },
  { id: "care", label: "and We Care" },
  { id: "vibe", label: "and We Vibe" },
  { id: "story", label: "and Our Story" },
  { id: "believe", label: "and We Believe" },
  { id: "ally", label: "and We Meet Coach" },
  { id: "schedule", label: "Schedule" },
  { id: "contact", label: "Contact" },
  { id: "home", label: "Home (top)" },
] as const;

export const DEFAULT_HERO_CTA_LABEL = "Find Your Flow";
export const DEFAULT_HERO_CTA_SECTION = "teach";

export type HeroCtaLinkMode = "section" | "url";

export interface HeroSlideCta {
  label: string;
  mode: HeroCtaLinkMode;
  sectionId: string;
  customUrl: string;
}

export interface HeroCtaConfig {
  applySameLinkToAll: boolean;
  slides: HeroSlideCta[];
}

export function defaultHeroSlideCta(): HeroSlideCta {
  return {
    label: DEFAULT_HERO_CTA_LABEL,
    mode: "section",
    sectionId: DEFAULT_HERO_CTA_SECTION,
    customUrl: "",
  };
}

export function defaultHeroCtaConfig(): HeroCtaConfig {
  return {
    applySameLinkToAll: true,
    slides: HERO_SLIDE_WORDS.map(() => defaultHeroSlideCta()),
  };
}

const slideCtaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  mode: z.enum(["section", "url"]),
  sectionId: z.string().trim().max(64).default(DEFAULT_HERO_CTA_SECTION),
  customUrl: z.string().trim().max(2000).default(""),
});

export const heroCtaConfigSchema = z
  .object({
    applySameLinkToAll: z.boolean(),
    slides: z.array(slideCtaSchema).length(HERO_SLIDE_WORDS.length),
  })
  .superRefine((value, ctx) => {
    value.slides.forEach((slide, index) => {
      if (slide.mode === "section" && !slide.sectionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Section is required",
          path: ["slides", index, "sectionId"],
        });
      }
      if (slide.mode === "url" && !slide.customUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL or path is required",
          path: ["slides", index, "customUrl"],
        });
      }
      if (slide.mode === "url" && slide.customUrl) {
        const url = slide.customUrl;
        const ok =
          /^https?:\/\//i.test(url) ||
          url.startsWith("/") ||
          url.startsWith("#") ||
          /^[a-z][a-z0-9_-]*$/i.test(url);
        if (!ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use an https URL, /path, #section, or section id",
            path: ["slides", index, "customUrl"],
          });
        }
      }
    });
  });

/** Normalize unknown DB/API payloads into a full config (never throws). */
export function parseHeroCtaConfig(value: unknown): HeroCtaConfig {
  const fallback = defaultHeroCtaConfig();
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;
  const applySameLinkToAll =
    typeof raw.applySameLinkToAll === "boolean" ? raw.applySameLinkToAll : true;

  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
  const slides = HERO_SLIDE_WORDS.map((_, index) => {
    const item = rawSlides[index];
    if (!item || typeof item !== "object") return defaultHeroSlideCta();
    const s = item as Record<string, unknown>;
    const mode: HeroCtaLinkMode = s.mode === "url" ? "url" : "section";
    const label =
      typeof s.label === "string" && s.label.trim()
        ? s.label.trim().slice(0, 80)
        : DEFAULT_HERO_CTA_LABEL;
    const sectionId =
      typeof s.sectionId === "string" && s.sectionId.trim()
        ? s.sectionId.trim().slice(0, 64)
        : DEFAULT_HERO_CTA_SECTION;
    const customUrl =
      typeof s.customUrl === "string" ? s.customUrl.trim().slice(0, 2000) : "";
    return { label, mode, sectionId, customUrl };
  });

  if (applySameLinkToAll && slides[0]) {
    const template = slides[0];
    return {
      applySameLinkToAll: true,
      slides: slides.map(() => ({ ...template })),
    };
  }

  return { applySameLinkToAll, slides };
}

/** Resolve the CTA for a slide index, honoring apply-same-to-all. */
export function resolveHeroSlideCta(config: HeroCtaConfig, slideIndex: number): HeroSlideCta {
  if (config.applySameLinkToAll) {
    return config.slides[0] ?? defaultHeroSlideCta();
  }
  return config.slides[slideIndex] ?? defaultHeroSlideCta();
}
