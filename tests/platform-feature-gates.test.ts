import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FEATURE_GATE_SETTING_KEYS,
  FEATURE_WEDIET_VISIBLE_KEY,
  FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY,
  PLATFORM_SETTING_KEYS,
  parseFeatureGateEnabled,
  parsePlatformBoolean,
} from "../shared/platform-settings.ts";

const root = join(import.meta.dirname, "..");

describe("SPEC-PLATFORM-FEATURE-GATES-01 shared keys", () => {
  it("exports exclusive feature gate keys", () => {
    assert.equal(FEATURE_WEDIET_VISIBLE_KEY, "feature_wediet_visible");
    assert.equal(FEATURE_ANDWEYOGA_ALWAYS_AVAILABLE_KEY, "feature_andweyoga_always_available");
    assert.equal(FEATURE_GATE_SETTING_KEYS.length, 7);
  });

  it("includes feature gates on the platform settings allowlist", () => {
    for (const key of FEATURE_GATE_SETTING_KEYS) {
      assert.ok((PLATFORM_SETTING_KEYS as readonly string[]).includes(key));
    }
  });

  it("parseFeatureGateEnabled fails open to true for unknown values", () => {
    assert.equal(parseFeatureGateEnabled(true), true);
    assert.equal(parseFeatureGateEnabled(false), false);
    assert.equal(parseFeatureGateEnabled("true"), true);
    assert.equal(parseFeatureGateEnabled("false"), false);
    assert.equal(parseFeatureGateEnabled(null), true);
    assert.equal(parseFeatureGateEnabled(undefined), true);
    assert.equal(parsePlatformBoolean(null, false), false);
  });
});

describe("feature gates wiring", () => {
  it("PATCH allowlist uses PLATFORM_SETTING_KEYS", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /z\.enum\(PLATFORM_SETTING_KEYS\)/);
    assert.match(source, /featureWedietVisible/);
    assert.match(source, /featureAndweyogaAlwaysAvailable/);
  });

  it("seeds feature gates in patch 046", () => {
    const sql = readFileSync(
      join(root, "scripts/db/patches/046-platform-feature-gates.sql"),
      "utf8",
    );
    assert.match(sql, /feature_wediet_visible/);
    assert.match(sql, /feature_andweyoga_always_available/);
    assert.match(sql, /feature_wediet boolean/);
    assert.match(sql, /feature_andweyoga boolean/);
  });

  it("platform controls panel exposes feature tab toggles", () => {
    const source = readFileSync(
      join(root, "client/src/components/admin/platform-controls-panel.tsx"),
      "utf8",
    );
    assert.match(source, /feature-wediet-visible-toggle/);
    assert.match(source, /feature-andweyoga-always-available-toggle/);
    assert.match(source, /feature-gates/);
  });

  it("launcher collapses when one tab remains and soft-redirects", () => {
    const source = readFileSync(
      join(root, "client/src/components/dashboard/dashboard-shell.tsx"),
      "utf8",
    );
    assert.match(source, /visibleItems\.length > 1/);
    assert.match(source, /setLocation\("\/dashboard", \{ replace: true \}\)/);
  });
});
