import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GUEST_CHECKOUT_SETTING_KEY,
  parseGuestCheckoutEnabled,
} from "../shared/platform-settings.ts";

const root = join(import.meta.dirname, "..");

describe("shared/platform-settings", () => {
  it("exports guest checkout setting key", () => {
    assert.equal(GUEST_CHECKOUT_SETTING_KEY, "guest_checkout_enabled");
  });

  it("parseGuestCheckoutEnabled handles boolean and string jsonb values", () => {
    assert.equal(parseGuestCheckoutEnabled(true), true);
    assert.equal(parseGuestCheckoutEnabled(false), false);
    assert.equal(parseGuestCheckoutEnabled("true"), true);
    assert.equal(parseGuestCheckoutEnabled("false"), false);
    assert.equal(parseGuestCheckoutEnabled(null), false);
  });
});

describe("platform-settings service source", () => {
  it("fail open when row missing is documented in getGuestCheckoutEnabled", () => {
    const source = readFileSync(join(root, "server/platform-settings.ts"), "utf8");
    assert.match(source, /row \? parseGuestCheckoutEnabled\(row\.value\) : true/);
    assert.match(source, /CACHE_TTL_MS = 30_000/);
    assert.match(source, /bustGuestCheckoutCache/);
  });

  it("setGuestCheckoutEnabled writes audit log with platform_setting_changed", () => {
    const source = readFileSync(join(root, "server/platform-settings.ts"), "utf8");
    assert.match(source, /platform_setting_changed/);
    assert.match(source, /oldValue: previous/);
    assert.match(source, /newValue: enabled/);
    assert.match(source, /insertAuditLog/);
  });
});

describe("platform settings patch file", () => {
  it("seeds guest_checkout_enabled false", () => {
    const sql = readFileSync(
      join(root, "scripts/db/patches/022-platform-settings.sql"),
      "utf8",
    );
    assert.match(sql, /guest_checkout_enabled/);
    assert.match(sql, /'false'::jsonb/);
  });
});
