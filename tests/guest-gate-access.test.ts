import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("guest gate admin access control (SPEC-GG-01)", () => {
  it("platform settings admin routes use requireSuperAdminAuth", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /app\.get\("\/api\/admin\/platform-settings", requireSuperAdminAuth/);
    assert.match(source, /app\.patch\("\/api\/admin\/platform-settings", requireSuperAdminAuth/);
    assert.match(
      source,
      /app\.patch\("\/api\/admin\/platform-settings\/guest-checkout", requireSuperAdminAuth/,
    );
  });

  it("PATCH body validates enabled boolean", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /enabled: z\.boolean\(\)/);
    assert.match(source, /enabled must be a boolean/);
  });

  it("maintenance window admin route uses requireSuperAdminAuth", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(
      source,
      /app\.patch\("\/api\/admin\/platform-settings\/maintenance-window", requireSuperAdminAuth/,
    );
  });

  it("Platform Controls tab is super_admin only in admin dashboard", () => {
    const source = readFileSync(join(root, "client/src/pages/admin-dashboard.tsx"), "utf8");
    assert.match(source, /isSuperAdmin \? \([\s\S]*platform-controls/);
    assert.match(source, /PlatformControlsPanel/);
    assert.doesNotMatch(
      source.slice(source.indexOf('TabsContent value="users"')),
      /guest-checkout-toggle/,
    );
  });

  it("guest checkout toggle lives in platform controls panel", () => {
    const source = readFileSync(
      join(root, "client/src/components/admin/platform-controls-panel.tsx"),
      "utf8",
    );
    assert.match(source, /guest-checkout-toggle/);
    assert.match(source, /90 seconds/);
    assert.match(source, /User Settings/);
  });

  it("requireSuperAdminAuth returns 403 for non-super_admin", () => {
    const source = readFileSync(join(root, "server/adminAuth.ts"), "utf8");
    assert.match(source, /role !== "super_admin"/);
    assert.match(source, /403/);
  });
});
