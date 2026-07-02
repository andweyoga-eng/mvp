import "dotenv/config";
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  getAdminBootstrapConfig,
  normalizeAdminEmail,
  normalizeAdminPassword,
} from "../server/admin-bootstrap.ts";
import { hashPassword, verifyPassword } from "../server/auth.ts";

describe("admin bootstrap config", () => {
  const orig = { ...process.env };

  after(() => {
    process.env.ADMIN_INITIAL_PASSWORD = orig.ADMIN_INITIAL_PASSWORD;
    process.env.ADMIN_INITIAL_EMAIL = orig.ADMIN_INITIAL_EMAIL;
    process.env.ADMIN_INITIAL_NAME = orig.ADMIN_INITIAL_NAME;
  });

  it("returns null when password missing or too short", () => {
    delete process.env.ADMIN_INITIAL_PASSWORD;
    assert.equal(getAdminBootstrapConfig(), null);
    process.env.ADMIN_INITIAL_PASSWORD = "short";
    assert.equal(getAdminBootstrapConfig(), null);
  });

  it("normalizes bootstrap email to lowercase", () => {
    process.env.ADMIN_INITIAL_PASSWORD = "test-password-12";
    process.env.ADMIN_INITIAL_EMAIL = "Admin@Example.COM";
    const cfg = getAdminBootstrapConfig();
    assert.ok(cfg);
    assert.equal(cfg!.email, "admin@example.com");
  });
});

describe("admin credential normalization", () => {
  it("trims and lowercases email", () => {
    assert.equal(normalizeAdminEmail("  Muditsachy@Gmail.com  "), "muditsachy@gmail.com");
  });

  it("trims password (no accidental space mismatch)", () => {
    assert.equal(normalizeAdminPassword("  secret12  "), "secret12");
  });
});

describe("bcrypt round-trip (admin passwords)", () => {
  it("hash and verify match", async () => {
    const hash = await hashPassword("Hriash9*");
    assert.equal(await verifyPassword("Hriash9*", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });
});

describe("legacy admin backdoor removed", () => {
  it("does not export LEGACY_ADMIN_PASSWORD", async () => {
    const mod = await import("../server/admin-bootstrap.ts");
    assert.equal("LEGACY_ADMIN_PASSWORD" in mod, false);
  });
});
