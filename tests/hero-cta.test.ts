import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_HERO_CTA_LABEL,
  DEFAULT_HERO_CTA_SECTION,
  HERO_PHRASE_DURATION_MS,
  HERO_SLIDE_WORDS,
  HERO_TRAIL_HOLD_MS,
  defaultHeroCtaConfig,
  heroCtaConfigSchema,
  parseHeroCtaConfig,
  publishedHeroSlides,
  resolveHeroSlideCta,
  resolveHeroSlideDisclaimer,
} from "../shared/hero-cta.ts";
import { heroCtaTargetsSchedule } from "../client/src/lib/home-navigation.ts";

const root = join(import.meta.dirname, "..");

describe("shared/hero-cta", () => {
  it("defaults to Find Your Flow → teach for all slides with apply-same on", () => {
    const config = defaultHeroCtaConfig();
    assert.equal(config.applySameLinkToAll, true);
    assert.equal(config.applySameDisclaimerToAll, false);
    assert.equal(config.slides[0]?.disclaimer, "");
    assert.equal(config.slides.length, HERO_SLIDE_WORDS.length);
    for (const slide of config.slides) {
      assert.equal(slide.label, DEFAULT_HERO_CTA_LABEL);
      assert.equal(slide.mode, "section");
      assert.equal(slide.sectionId, DEFAULT_HERO_CTA_SECTION);
      assert.equal(slide.published, true);
      assert.equal(slide.imageUrl, null);
      assert.equal(slide.holdMs, HERO_TRAIL_HOLD_MS);
      assert.equal(slide.phrases.length, 3);
      assert.equal(slide.phrases[0]?.durationMs, HERO_PHRASE_DURATION_MS);
    }
    assert.equal(config.slides[2]?.phrases[1]?.accent, "Express");
    assert.equal(config.slides[2]?.phrases[2]?.lead, "To Feel");
  });

  it("parseHeroCtaConfig fills missing slides and mirrors apply-same", () => {
    const parsed = parseHeroCtaConfig({
      applySameLinkToAll: true,
      slides: [{ label: "Book Now", mode: "section", sectionId: "ally", customUrl: "" }],
    });
    assert.equal(parsed.slides.length, 6);
    assert.equal(parsed.slides[3]?.label, "Book Now");
    assert.equal(parsed.slides[3]?.sectionId, "ally");
  });

  it("resolveHeroSlideCta honors apply-same vs per-slide", () => {
    const config = defaultHeroCtaConfig();
    config.applySameLinkToAll = false;
    const express = config.slides[2]!;
    config.slides[2] = {
      ...express,
      label: "Meet Coach",
      mode: "section",
      sectionId: "ally",
      customUrl: "",
    };
    assert.equal(resolveHeroSlideCta(config, config.slides[2]!).sectionId, "ally");
    config.applySameLinkToAll = true;
    assert.equal(resolveHeroSlideCta(config, config.slides[2]!).sectionId, "teach");
  });

  it("maps a slide to an and We Flow card and shares that card when apply-same is on", () => {
    const parsed = parseHeroCtaConfig({
      applySameLinkToAll: false,
      slides: [
        {
          word: "Embrace",
          published: true,
          mode: "flow",
          classTypeId: "card-1",
          label: "Book Embrace",
        },
        {
          word: "Express",
          published: true,
          mode: "section",
          sectionId: "ally",
          classTypeId: "",
        },
      ],
    });
    assert.equal(parsed.slides[0]?.mode, "flow");
    assert.equal(parsed.slides[0]?.classTypeId, "card-1");
    assert.equal(resolveHeroSlideCta(parsed, parsed.slides[1]!).mode, "section");
    parsed.applySameLinkToAll = true;
    assert.equal(resolveHeroSlideCta(parsed, parsed.slides[1]!).mode, "flow");
    assert.equal(resolveHeroSlideCta(parsed, parsed.slides[1]!).classTypeId, "card-1");

    const missing = heroCtaConfigSchema.safeParse({
      ...defaultHeroCtaConfig(),
      applySameLinkToAll: false,
      slides: defaultHeroCtaConfig().slides.map((slide, index) =>
        index === 0 ? { ...slide, mode: "flow", classTypeId: "" } : slide,
      ),
    });
    assert.equal(missing.success, false);
  });

  it("keeps a per-slide disclaimer unless apply-same copies the first slide", () => {
    const parsed = parseHeroCtaConfig({
      applySameLinkToAll: false,
      applySameDisclaimerToAll: false,
      slides: [
        {
          word: "Embrace",
          published: true,
          disclaimer: "  Trial classes are subject to availability.  ",
        },
        {
          word: "Express",
          published: true,
          disclaimer: "Express only.",
        },
      ],
    });
    assert.equal(parsed.applySameDisclaimerToAll, false);
    assert.equal(parsed.slides[0]?.disclaimer, "Trial classes are subject to availability.");
    assert.equal(resolveHeroSlideDisclaimer(parsed, parsed.slides[1]!), "Express only.");

    parsed.applySameDisclaimerToAll = true;
    assert.equal(
      resolveHeroSlideDisclaimer(parsed, parsed.slides[1]!),
      "Trial classes are subject to availability.",
    );

    const shared = parseHeroCtaConfig({
      ...parsed,
      applySameDisclaimerToAll: true,
    });
    assert.equal(shared.slides[1]?.disclaimer, shared.slides[0]?.disclaimer);

    const tooLong = heroCtaConfigSchema.safeParse({
      ...defaultHeroCtaConfig(),
      slides: defaultHeroCtaConfig().slides.map((slide, index) =>
        index === 0 ? { ...slide, disclaimer: "x".repeat(121) } : slide,
      ),
    });
    assert.equal(tooLong.success, false);
  });

  it("keeps a saved subset of slides and drops unpublished ones from the homepage", () => {
    const parsed = parseHeroCtaConfig({
      applySameLinkToAll: false,
      slides: [
        {
          word: "Become",
          published: true,
          imageUrl: null,
          phrases: [
            { lead: "and We", accent: "Yoga", durationMs: 2200 },
            { lead: "To", accent: "Become", durationMs: 3000 },
            { lead: "Who we are", accent: "meant to be", durationMs: 2200 },
          ],
          holdMs: 1500,
          label: "Join",
          mode: "section",
          sectionId: "teach",
          customUrl: "",
        },
        {
          word: "Express",
          published: false,
          imageUrl: null,
          label: "Hidden",
          mode: "section",
          sectionId: "care",
          customUrl: "",
        },
      ],
    });
    assert.deepEqual(
      parsed.slides.map((slide) => slide.word),
      ["Express", "Become"],
    );
    assert.equal(parsed.slides[0]?.published, false);
    assert.equal(parsed.slides[1]?.phrases[1]?.durationMs, 3000);
    assert.equal(parsed.slides[1]?.holdMs, 1500);
    assert.deepEqual(
      publishedHeroSlides(parsed).map((slide) => slide.word),
      ["Become"],
    );
  });

  it("heroCtaConfigSchema requires url when mode is url", () => {
    const config = defaultHeroCtaConfig();
    const bad = heroCtaConfigSchema.safeParse({
      applySameLinkToAll: true,
      slides: config.slides.map((slide) => ({
        ...slide,
        mode: "url",
        customUrl: "",
      })),
    });
    assert.equal(bad.success, false);
  });

  it("heroCtaConfigSchema rejects a hero with no published slide", () => {
    const config = defaultHeroCtaConfig();
    const bad = heroCtaConfigSchema.safeParse({
      ...config,
      slides: config.slides.map((slide) => ({ ...slide, published: false })),
    });
    assert.equal(bad.success, false);
  });
});

describe("hero CTA wiring", () => {
  it("exposes public and admin GTM hero-cta routes", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /app\.get\("\/api\/hero-cta"/);
    assert.match(source, /app\.get\("\/api\/admin\/gtm\/hero-cta", requireAdminAuth/);
    assert.match(source, /app\.put\("\/api\/admin\/gtm\/hero-cta", requireAdminAuth/);
  });

  it("admin dashboard adds GTM, Sales, and CA tabs for all admins", () => {
    const source = readFileSync(join(root, "client/src/pages/admin-dashboard.tsx"), "utf8");
    assert.match(source, /GTM Operations/);
    assert.match(source, /Sales and Revenue Management/);
    assert.match(source, /CA Corner/);
    assert.match(source, /GtmOperationsPanel/);
    assert.match(source, /<TabsTrigger value="gtm-operations"/);
    assert.match(source, /<TabsTrigger value="sales-revenue"/);
    assert.match(source, /<TabsTrigger value="ca-corner"/);
    // Not wrapped in isSuperAdmin (unlike Platform Controls).
    assert.doesNotMatch(
      source,
      /isSuperAdmin \? \(\s*<TabsTrigger value="gtm-operations"/,
    );
  });

  it("schedule section CTA is the sign-in path, other sections still navigate", () => {
    assert.equal(
      heroCtaTargetsSchedule({
        label: "Schedule",
        mode: "section",
        sectionId: "schedule",
        customUrl: "",
      }),
      true,
    );
    assert.equal(
      heroCtaTargetsSchedule({
        label: "Find Your Flow",
        mode: "section",
        sectionId: "teach",
        customUrl: "",
      }),
      false,
    );
    assert.equal(
      heroCtaTargetsSchedule({
        label: "Site",
        mode: "url",
        sectionId: "schedule",
        customUrl: "https://example.com",
      }),
      false,
    );
  });

  it("hero carousel swipes, taps outside CTA, and loads config", () => {
    const source = readFileSync(
      join(root, "client/src/components/hero-carousel.tsx"),
      "utf8",
    );
    assert.match(source, /onPointerDown/);
    assert.match(source, /activateHeroCta/);
    assert.match(source, /\/api\/hero-cta/);
    assert.match(source, /data-hero-no-navigate/);
    assert.match(source, /publishedHeroSlides/);
    assert.match(source, /hero-slide-disclaimer/);
    assert.match(source, /resolveHeroSlideDisclaimer/);
    assert.match(source, /heroCtaTargetsFlowCard/);
    assert.match(source, /onFlowCard/);
    assert.match(source, /isPlaceholderData/);
  });

  it("dashboard banner shows only the slides marked on in GTM", () => {
    const source = readFileSync(join(root, "client/src/pages/dashboard.tsx"), "utf8");
    assert.match(source, /\/api\/hero-cta/);
    assert.match(source, /slide\.published/);
    assert.match(source, /heroSlideImageSrc/);
    assert.doesNotMatch(source, /embrace-carousel\.png/);
    assert.doesNotMatch(source, /HERO_IMAGES/);
  });

  it("GTM panel offers one shared disclaimer or a box on each slide", () => {
    const source = readFileSync(
      join(root, "client/src/components/admin/gtm-operations-panel.tsx"),
      "utf8",
    );
    assert.match(source, /gtm-apply-same-disclaimer/);
    assert.match(source, /gtm-shared-disclaimer/);
    assert.match(source, /gtm-slide-disclaimer-/);
    assert.match(source, /showDisclaimer=\{!draft\.applySameDisclaimerToAll\}/);
    assert.match(source, /gtm-cta-flow-card/);
    assert.match(source, /and We Flow card/);
  });

  it("ships SQL seed patch for hero_cta_config", () => {
    const source = readFileSync(
      join(root, "scripts/db/patches/047-hero-cta-config.sql"),
      "utf8",
    );
    assert.match(source, /hero_cta_config/);
    assert.match(source, /Find Your Flow/);
  });
});
