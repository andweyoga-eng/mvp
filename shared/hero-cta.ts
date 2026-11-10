import { z } from "zod";

/** Brand order of the home hero slides. */
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

/** How long each default line stays on screen, and the pause on the last line. */
export const HERO_PHRASE_DURATION_MS = 2200;
export const HERO_TRAIL_HOLD_MS = 1000;
export const HERO_DURATION_MIN_MS = 500;
export const HERO_DURATION_MAX_MS = 15_000;
/** Matches the compressed JPEG cap used by admin image uploads. */
export const HERO_IMAGE_MAX_DATA_URL = 900_000;

/** Home-page section ids offered in the GTM section picker. */
export const HERO_CTA_HOME_SECTIONS = [
  { id: "teach", label: "and We Flow (teach)" },
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
/** One short line along the bottom of the hero photo. */
export const HERO_DISCLAIMER_MAX = 120;

export type HeroCtaLinkMode = "section" | "url" | "flow";

/** One line of the word trail: regular lead, italic accent, on-screen time. */
export interface HeroPhrase {
  lead: string;
  accent: string;
  durationMs: number;
}

export interface HeroSlideCta {
  word: HeroSlideWord;
  published: boolean;
  /** Compressed data URL. Null uses the built-in photo for this slide. */
  imageUrl: string | null;
  phrases: HeroPhrase[];
  /** Extra time the last line stays up before the next slide or a repeat. */
  holdMs: number;
  label: string;
  mode: HeroCtaLinkMode;
  sectionId: string;
  customUrl: string;
  /** and We Flow card (class type) when mode is "flow". */
  classTypeId: string;
  /** Short line shown along the bottom of this slide. Blank shows nothing. */
  disclaimer: string;
}

export interface HeroCtaConfig {
  applySameLinkToAll: boolean;
  /** When true, every slide uses the first slide's disclaimer. */
  applySameDisclaimerToAll: boolean;
  slides: HeroSlideCta[];
}

const HERO_SLIDE_PHRASES: Record<HeroSlideWord, readonly [HeroPhrase, HeroPhrase, HeroPhrase]> = {
  Embrace: [
    { lead: "and We", accent: "Yoga", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To", accent: "Embrace", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "Journey of Self", accent: "Discovery", durationMs: HERO_PHRASE_DURATION_MS },
  ],
  Experience: [
    { lead: "and We", accent: "Yoga", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To", accent: "Experience", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "Our Body", accent: "inside out, Outside in.", durationMs: HERO_PHRASE_DURATION_MS },
  ],
  Express: [
    { lead: "and We", accent: "Yoga", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To", accent: "Express", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To Feel", accent: "Safe", durationMs: HERO_PHRASE_DURATION_MS },
  ],
  Evolve: [
    { lead: "and We", accent: "Yoga", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To", accent: "Evolve", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To Learn and", accent: "Grow", durationMs: HERO_PHRASE_DURATION_MS },
  ],
  Elevate: [
    { lead: "and We", accent: "Yoga", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To", accent: "Elevate", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To push beyond", accent: "our limits", durationMs: HERO_PHRASE_DURATION_MS },
  ],
  Become: [
    { lead: "and We", accent: "Yoga", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "To", accent: "Become", durationMs: HERO_PHRASE_DURATION_MS },
    { lead: "Who we are", accent: "meant to be", durationMs: HERO_PHRASE_DURATION_MS },
  ],
};

export function isHeroSlideWord(value: unknown): value is HeroSlideWord {
  return typeof value === "string" && (HERO_SLIDE_WORDS as readonly string[]).includes(value);
}

export function defaultHeroPhrases(word: HeroSlideWord): HeroPhrase[] {
  return HERO_SLIDE_PHRASES[word].map((phrase) => ({ ...phrase }));
}

export function defaultHeroSlideCta(word: HeroSlideWord = "Embrace"): HeroSlideCta {
  return {
    word,
    published: true,
    imageUrl: null,
    phrases: defaultHeroPhrases(word),
    holdMs: HERO_TRAIL_HOLD_MS,
    label: DEFAULT_HERO_CTA_LABEL,
    mode: "section",
    sectionId: DEFAULT_HERO_CTA_SECTION,
    customUrl: "",
    classTypeId: "",
    disclaimer: "",
  };
}

export function defaultHeroCtaConfig(): HeroCtaConfig {
  return {
    applySameLinkToAll: true,
    applySameDisclaimerToAll: false,
    slides: HERO_SLIDE_WORDS.map((word) => defaultHeroSlideCta(word)),
  };
}

/** Slides that should render. Never empty. */
export function publishedHeroSlides(config: HeroCtaConfig): HeroSlideCta[] {
  const published = config.slides.filter((slide) => slide.published);
  if (published.length > 0) return published;
  const first = config.slides[0];
  return first ? [first] : defaultHeroCtaConfig().slides;
}

/** CTA for a slide, honoring apply-same-to-all. */
export function resolveHeroSlideCta(config: HeroCtaConfig, slide: HeroSlideCta): HeroSlideCta {
  if (!config.applySameLinkToAll) return slide;
  const shared = config.slides[0] ?? slide;
  return {
    ...slide,
    label: shared.label,
    mode: shared.mode,
    sectionId: shared.sectionId,
    customUrl: shared.customUrl,
    classTypeId: shared.classTypeId,
  };
}

export function shareHeroCta(slides: HeroSlideCta[], shared: HeroSlideCta): HeroSlideCta[] {
  return slides.map((slide) => ({
    ...slide,
    label: shared.label,
    mode: shared.mode,
    sectionId: shared.sectionId,
    customUrl: shared.customUrl,
    classTypeId: shared.classTypeId,
  }));
}

export function shareHeroDisclaimer(slides: HeroSlideCta[], disclaimer: string): HeroSlideCta[] {
  return slides.map((slide) => ({ ...slide, disclaimer }));
}

/** Disclaimer for a slide, honoring apply-same-to-all. Blank means show nothing. */
export function resolveHeroSlideDisclaimer(config: HeroCtaConfig, slide: HeroSlideCta): string {
  const source = config.applySameDisclaimerToAll ? (config.slides[0] ?? slide) : slide;
  return source.disclaimer.trim().slice(0, HERO_DISCLAIMER_MAX);
}

const HERO_IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;

const phraseSchema = z
  .object({
    lead: z.string().trim().max(80),
    accent: z.string().trim().max(80),
    durationMs: z.number().int().min(HERO_DURATION_MIN_MS).max(HERO_DURATION_MAX_MS),
  })
  .superRefine((phrase, ctx) => {
    if (!phrase.lead && !phrase.accent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter regular text, italic text, or both",
      });
    }
  });

const slideCtaSchema = z.object({
  word: z.enum(HERO_SLIDE_WORDS),
  published: z.boolean(),
  imageUrl: z
    .string()
    .max(HERO_IMAGE_MAX_DATA_URL)
    .regex(HERO_IMAGE_DATA_URL, "Upload a JPEG, PNG, or WebP image")
    .nullable(),
  phrases: z.array(phraseSchema).length(3),
  holdMs: z.number().int().min(HERO_DURATION_MIN_MS).max(HERO_DURATION_MAX_MS),
  label: z.string().trim().min(1).max(80),
  mode: z.enum(["section", "url", "flow"]),
  sectionId: z.string().trim().max(64).default(DEFAULT_HERO_CTA_SECTION),
  customUrl: z.string().trim().max(2000).default(""),
  classTypeId: z.string().trim().max(64).default(""),
  disclaimer: z.string().trim().max(HERO_DISCLAIMER_MAX).default(""),
});

export const heroCtaConfigSchema = z
  .object({
    applySameLinkToAll: z.boolean(),
    applySameDisclaimerToAll: z.boolean().default(false),
    slides: z.array(slideCtaSchema).min(1).max(HERO_SLIDE_WORDS.length),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    if (!value.slides.some((slide) => slide.published)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Show at least one slide on the homepage",
        path: ["slides"],
      });
    }
    value.slides.forEach((slide, index) => {
      if (seen.has(slide.word)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each slide can only appear once",
          path: ["slides", index, "word"],
        });
      }
      seen.add(slide.word);
      if (slide.mode === "section" && !slide.sectionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Section is required",
          path: ["slides", index, "sectionId"],
        });
      }
      if (slide.mode === "flow" && !slide.classTypeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose an and We Flow card",
          path: ["slides", index, "classTypeId"],
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

function clampDuration(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(HERO_DURATION_MAX_MS, Math.max(HERO_DURATION_MIN_MS, Math.round(n)));
}

function parsePhrase(value: unknown, fallback: HeroPhrase): HeroPhrase {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Record<string, unknown>;
  const lead = typeof raw.lead === "string" ? raw.lead.trim().slice(0, 80) : fallback.lead;
  const accent = typeof raw.accent === "string" ? raw.accent.trim().slice(0, 80) : fallback.accent;
  const durationMs = clampDuration(raw.durationMs, fallback.durationMs);
  if (!lead && !accent) return { ...fallback, durationMs };
  return { lead, accent, durationMs };
}

function parseImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.length > HERO_IMAGE_MAX_DATA_URL) return null;
  if (!HERO_IMAGE_DATA_URL.test(value)) return null;
  return value;
}

function parseCtaFields(
  value: unknown,
  fallback: Pick<HeroSlideCta, "label" | "mode" | "sectionId" | "customUrl" | "classTypeId">,
): Pick<HeroSlideCta, "label" | "mode" | "sectionId" | "customUrl" | "classTypeId"> {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Record<string, unknown>;
  const mode: HeroCtaLinkMode =
    raw.mode === "url" ? "url" : raw.mode === "flow" ? "flow" : "section";
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 80)
      : fallback.label;
  const sectionId =
    typeof raw.sectionId === "string" && raw.sectionId.trim()
      ? raw.sectionId.trim().slice(0, 64)
      : fallback.sectionId;
  const customUrl = typeof raw.customUrl === "string" ? raw.customUrl.trim().slice(0, 2000) : "";
  const classTypeId =
    typeof raw.classTypeId === "string" ? raw.classTypeId.trim().slice(0, 64) : fallback.classTypeId;
  return { label, mode, sectionId, customUrl, classTypeId };
}

function mirrorSharedCta(
  applySameLinkToAll: boolean,
  applySameDisclaimerToAll: boolean,
  slides: HeroSlideCta[],
): HeroCtaConfig {
  let next = slides;
  if (applySameLinkToAll && next[0]) next = shareHeroCta(next, next[0]);
  if (applySameDisclaimerToAll && next[0]) next = shareHeroDisclaimer(next, next[0].disclaimer);
  return {
    applySameLinkToAll: Boolean(applySameLinkToAll && next[0]),
    applySameDisclaimerToAll: Boolean(applySameDisclaimerToAll && next[0]),
    slides: next,
  };
}

function orderSlides(slides: HeroSlideCta[]): HeroSlideCta[] {
  const byWord = new Map(slides.map((slide) => [slide.word, slide]));
  return HERO_SLIDE_WORDS.flatMap((word) => {
    const slide = byWord.get(word);
    return slide ? [slide] : [];
  });
}

function ensureOnePublished(slides: HeroSlideCta[]): HeroSlideCta[] {
  if (slides.some((slide) => slide.published)) return slides;
  return slides.map((slide, index) => (index === 0 ? { ...slide, published: true } : slide));
}

/** Normalize unknown DB/API payloads into a full config (never throws). */
export function parseHeroCtaConfig(value: unknown): HeroCtaConfig {
  const fallback = defaultHeroCtaConfig();
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Record<string, unknown>;
  const applySameLinkToAll =
    typeof raw.applySameLinkToAll === "boolean" ? raw.applySameLinkToAll : true;
  const applySameDisclaimerToAll = raw.applySameDisclaimerToAll === true;
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
  const legacy = rawSlides.every((item) => {
    if (!item || typeof item !== "object") return true;
    return !isHeroSlideWord((item as Record<string, unknown>).word);
  });

  if (legacy) {
    const slides = HERO_SLIDE_WORDS.map((word, index) => {
      const base = defaultHeroSlideCta(word);
      return { ...base, ...parseCtaFields(rawSlides[index], base) };
    });
    return mirrorSharedCta(applySameLinkToAll, applySameDisclaimerToAll, slides);
  }

  const parsed: HeroSlideCta[] = [];
  const seen = new Set<HeroSlideWord>();
  for (const item of rawSlides) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isHeroSlideWord(row.word) || seen.has(row.word)) continue;
    seen.add(row.word);
    const base = defaultHeroSlideCta(row.word);
    const phraseRows = Array.isArray(row.phrases) ? row.phrases : [];
    parsed.push({
      ...base,
      ...parseCtaFields(row, base),
      published: typeof row.published === "boolean" ? row.published : true,
      imageUrl: parseImageUrl(row.imageUrl),
      phrases: [0, 1, 2].map((index) => parsePhrase(phraseRows[index], base.phrases[index]!)),
      holdMs: clampDuration(row.holdMs, base.holdMs),
      disclaimer: parseDisclaimer(row.disclaimer),
    });
  }

  if (parsed.length === 0) return fallback;
  return mirrorSharedCta(
    applySameLinkToAll,
    applySameDisclaimerToAll,
    ensureOnePublished(orderSlides(parsed)),
  );
}

function parseDisclaimer(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, HERO_DISCLAIMER_MAX);
}
