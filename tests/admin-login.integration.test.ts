/**
 * DB integration: admin login against real DATABASE_URL (skips if unset).
 * Run: npm test
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";

const hasDb =
  !!(process.env.DATABASE_URL?.trim() || process.env.DATABASE_PUBLIC_URL?.trim()) &&
  !!(process.env.ADMIN_INITIAL_PASSWORD?.trim() && process.env.ADMIN_INITIAL_PASSWORD.trim().length >= 8);

describe("admin login integration", { skip: !hasDb }, () => {
  before(async () => {
    const { storageReady } = await import("../server/storage.ts");
    await storageReady;
  });

  it("syncAdminFromEnv + verifyAdminCredentials succeeds with env credentials", async () => {
    const { storage } = await import("../server/storage.ts");
    const {
      getAdminBootstrapConfig,
      normalizeAdminEmail,
      normalizeAdminPassword,
    } = await import("../server/admin-bootstrap.ts");

    const cfg = getAdminBootstrapConfig();
    assert.ok(cfg, "ADMIN_INITIAL_PASSWORD must be set for integration test");

    await storage.syncAdminFromEnv();

    const admin = await storage.verifyAdminCredentials(
      normalizeAdminEmail(cfg!.email),
      normalizeAdminPassword(cfg!.password),
    );

    assert.ok(admin, "verifyAdminCredentials should return admin row");
    assert.equal(admin!.email, cfg!.email);
    assert.ok(admin!.passwordHash, "password_hash should be set after sync");
  });

  it("getAdminByEmail finds bootstrap email (eq lookup, not broken SQL)", async () => {
    const { storage } = await import("../server/storage.ts");
    const { getAdminBootstrapConfig, normalizeAdminEmail } = await import(
      "../server/admin-bootstrap.ts"
    );
    const cfg = getAdminBootstrapConfig();
    assert.ok(cfg);
    const admin = await storage.getAdminByEmail(normalizeAdminEmail(cfg!.email));
    assert.ok(admin);
  });
});
