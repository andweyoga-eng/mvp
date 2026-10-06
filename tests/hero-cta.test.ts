import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_HERO_CTA_LABEL,
  DEFAULT_HERO_CTA_SECTION,
  HERO_SLIDE_WORDS,
  defaultHeroCtaConfig,
  heroCtaConfigSchema,
  parseHeroCtaConfig,
  resolveHeroSlideCta,
} from "../shared/hero-cta.ts";

const root = join(import.meta.dirname, "..");

describe("shared/hero-cta", () => {
  it("defaults to Find Your Flow → teach for all slides with apply-same on", () => {
    const config = defaultHeroCtaConfig();
    assert.equal(config.applySameLinkToAll, true);
    assert.equal(config.slides.length, HERO_SLIDE_WORDS.length);
    for (const slide of config.slides) {
      assert.equal(slide.label, DEFAULT_HERO_CTA_LABEL);
      assert.equal(slide.mode, "section");
      assert.equal(slide.sectionId, DEFAULT_HERO_CTA_SECTION);
    }
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
    config.slides[2] = {
      label: "Meet Coach",
      mode: "section",
      sectionId: "ally",
      customUrl: "",
    };
    assert.equal(resolveHeroSlideCta(config, 2).sectionId, "ally");
    config.applySameLinkToAll = true;
    assert.equal(resolveHeroSlideCta(config, 2).sectionId, "teach");
  });

  it("heroCtaConfigSchema requires url when mode is url", () => {
    const bad = heroCtaConfigSchema.safeParse({
      applySameLinkToAll: true,
      slides: Array.from({ length: 6 }, () => ({
        label: "Go",
        mode: "url",
        sectionId: "teach",
        customUrl: "",
      })),
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

  it("hero carousel swipes, taps outside CTA, and loads config", () => {
    const source = readFileSync(
      join(root, "client/src/components/hero-carousel.tsx"),
      "utf8",
    );
    assert.match(source, /onPointerDown/);
    assert.match(source, /activateHeroCta/);
    assert.match(source, /\/api\/hero-cta/);
    assert.match(source, /data-hero-no-navigate/);
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
