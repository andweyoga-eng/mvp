import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GUEST_CHECKOUT_SETTING_KEY,
  MAINTENANCE_WINDOW_SETTING_KEY,
  parseGuestCheckoutEnabled,
  parseMaintenanceWindowEnabled,
} from "../shared/platform-settings.ts";
import { resolveMaintenanceChannels } from "../shared/maintenance-notify.ts";

const root = join(import.meta.dirname, "..");

describe("shared/platform-settings", () => {
  it("exports guest checkout setting key", () => {
    assert.equal(GUEST_CHECKOUT_SETTING_KEY, "guest_checkout_enabled");
  });

  it("exports maintenance window setting key", () => {
    assert.equal(MAINTENANCE_WINDOW_SETTING_KEY, "maintenance_window_enabled");
  });

  it("parseGuestCheckoutEnabled handles boolean and string jsonb values", () => {
    assert.equal(parseGuestCheckoutEnabled(true), true);
    assert.equal(parseGuestCheckoutEnabled(false), false);
    assert.equal(parseGuestCheckoutEnabled("true"), true);
    assert.equal(parseGuestCheckoutEnabled("false"), false);
    assert.equal(parseGuestCheckoutEnabled(null), false);
  });

  it("parseMaintenanceWindowEnabled handles boolean and string jsonb values", () => {
    assert.equal(parseMaintenanceWindowEnabled(true), true);
    assert.equal(parseMaintenanceWindowEnabled(false), false);
    assert.equal(parseMaintenanceWindowEnabled("true"), true);
    assert.equal(parseMaintenanceWindowEnabled("false"), false);
    assert.equal(parseMaintenanceWindowEnabled(null), false);
  });
});

describe("platform-settings service source", () => {
  it("fail open when row missing is documented in getGuestCheckoutEnabled", () => {
    const source = readFileSync(join(root, "server/platform-settings.ts"), "utf8");
    assert.match(source, /row \? parseGuestCheckoutEnabled\(row\.value\) : true/);
    assert.match(source, /CACHE_TTL_MS = 30_000/);
    assert.match(source, /bustGuestCheckoutCache/);
  });

  it("maintenance window fails closed when row missing", () => {
    const source = readFileSync(join(root, "server/platform-settings.ts"), "utf8");
    assert.match(source, /row \? parseMaintenanceWindowEnabled\(row\.value\) : false/);
    assert.match(source, /bustMaintenanceWindowCache/);
    assert.match(source, /notifyMaintenanceWindowEnabled/);
  });

  it("setGuestCheckoutEnabled writes audit log with platform_setting_changed", () => {
    const source = readFileSync(join(root, "server/platform-settings.ts"), "utf8");
    assert.match(source, /platform_setting_changed/);
    assert.match(source, /oldValue: previous/);
    assert.match(source, /newValue: enabled/);
    assert.match(source, /insertAuditLog/);
  });

  it("setMaintenanceWindowEnabled notifies only on false to true transition", () => {
    const source = readFileSync(join(root, "server/platform-settings.ts"), "utf8");
    assert.match(source, /if \(enabled && !previous\)/);
    assert.match(source, /MAINTENANCE_WINDOW_SETTING_KEY/);
  });
});

describe("platform settings patch files", () => {
  it("seeds guest_checkout_enabled false", () => {
    const sql = readFileSync(
      join(root, "scripts/db/patches/022-platform-settings.sql"),
      "utf8",
    );
    assert.match(sql, /guest_checkout_enabled/);
    assert.match(sql, /'false'::jsonb/);
  });

  it("seeds maintenance_window_enabled false", () => {
    const sql = readFileSync(
      join(root, "scripts/db/patches/031-maintenance-window.sql"),
      "utf8",
    );
    assert.match(sql, /maintenance_window_enabled/);
    assert.match(sql, /'false'::jsonb/);
  });
});

describe("resolveMaintenanceChannels", () => {
  const baseUser = {
    id: "user-1",
    isActive: true,
    email: "member@example.com",
    whatsappConsent: false,
    primaryMobile: "9876543210",
  };

  it("returns email when profile_booking consent is active", async () => {
    const channels = await resolveMaintenanceChannels(baseUser, async (_id, type) => {
      return type === "profile_booking";
    });
    assert.deepEqual(channels, ["email"]);
  });

  it("skips inactive users", async () => {
    const channels = await resolveMaintenanceChannels(
      { ...baseUser, isActive: false },
      async () => true,
    );
    assert.deepEqual(channels, []);
  });

  it("skips WhatsApp when whatsappConsent is false", async () => {
    const channels = await resolveMaintenanceChannels(
      { ...baseUser, whatsappConsent: false },
      async (_id, type) => type === "whatsapp_contact",
    );
    assert.deepEqual(channels, []);
  });

  it("includes WhatsApp when opted in and audit consent is active", async () => {
    const channels = await resolveMaintenanceChannels(
      { ...baseUser, whatsappConsent: true },
      async (_id, type) => type === "whatsapp_contact",
    );
    assert.deepEqual(channels, ["whatsapp"]);
  });

  it("includes both email and WhatsApp when both consents are active", async () => {
    const channels = await resolveMaintenanceChannels(
      { ...baseUser, whatsappConsent: true },
      async () => true,
    );
    assert.deepEqual(channels, ["email", "whatsapp"]);
  });

  it("does not include SMS channel", async () => {
    const channels = await resolveMaintenanceChannels(baseUser, async () => true);
    assert.equal(channels.includes("sms"), false);
  });
});

describe("maintenance window UI and routes", () => {
  it("unified PATCH validates key and enabled", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /z\.enum\(\[GUEST_CHECKOUT_SETTING_KEY, MAINTENANCE_WINDOW_SETTING_KEY\]\)/);
    assert.match(source, /setPlatformSettingByKey/);
  });

  it("startup seeds default platform settings", () => {
    const source = readFileSync(join(root, "server/index.ts"), "utf8");
    assert.match(source, /ensureDefaultPlatformSettings/);
  });

  it("platform config exposes maintenanceWindowEnabled", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /maintenanceWindowEnabled: await getMaintenanceWindowEnabled\(\)/);
  });

  it("maintenance toggle uses unified platform settings PATCH", () => {
    const source = readFileSync(
      join(root, "client/src/components/admin/platform-controls-panel.tsx"),
      "utf8",
    );
    assert.match(source, /fetch\("\/api\/admin\/platform-settings"/);
    assert.match(source, /MAINTENANCE_WINDOW_SETTING_KEY/);
    assert.match(source, /maintenance-window-toggle/);
    assert.match(source, /consented channels/);
  });

  it("overlay skips admin routes and optional env opt-out", () => {
    const source = readFileSync(
      join(root, "client/src/components/maintenance-window-overlay.tsx"),
      "utf8",
    );
    assert.match(source, /VITE_SKIP_MAINTENANCE_OVERLAY/);
    assert.match(source, /location\.startsWith\("\/admin"\)/);
    assert.match(source, /maintenance-window-overlay/);
    assert.doesNotMatch(source, /import\.meta\.env\.DEV/);
  });

  it("overlay is mounted in App", () => {
    const source = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(source, /MaintenanceWindowOverlay/);
  });

  it("notify service skips non-production", () => {
    const source = readFileSync(join(root, "server/maintenance-notify-service.ts"), "utf8");
    assert.match(source, /NODE_ENV !== "production"/);
    assert.match(source, /No SMS consent on file/);
    assert.match(source, /resolveMaintenanceChannels/);
  });
});
