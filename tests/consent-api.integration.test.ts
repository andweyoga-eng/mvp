/**
 * Consent API integration — exercises HTTP routes against real DATABASE_URL (skips if unset).
 * Applies patch 019 automatically when the consent schema is missing.
 * Run: npm test
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import express, { type Express } from "express";
import http from "node:http";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import "dotenv/config";
import { LEGAL_CONFIG } from "../shared/legal-config.ts";
import { consentVersion } from "../server/consent.ts";

const hasDb =
  !!(process.env.DATABASE_URL?.trim() || process.env.DATABASE_PUBLIC_URL?.trim()) &&
  !!process.env.JWT_SECRET?.trim();

type HttpResult = {
  status: number;
  json: Record<string, unknown> | null;
  raw: string;
  headers: http.IncomingHttpHeaders;
};

function request(
  app: Express,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    cookie?: string;
  } = {},
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      const payload = options.body !== undefined ? JSON.stringify(options.body) : null;
      const reqHeaders: Record<string, string> = { ...options.headers };
      if (payload) {
        reqHeaders["Content-Type"] = "application/json";
        reqHeaders["Content-Length"] = String(Buffer.byteLength(payload));
      }
      if (options.cookie) reqHeaders.Cookie = options.cookie;

      const req = http.request(
        { hostname: "127.0.0.1", port, path, method, headers: reqHeaders },
        (res) => {
          let raw = "";
          res.on("data", (chunk) => (raw += chunk));
          res.on("end", () => {
            server.close();
            let json: Record<string, unknown> | null = null;
            try {
              json = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              json = null;
            }
            resolve({
              status: res.statusCode ?? 0,
              json,
              raw,
              headers: res.headers,
            });
          });
        },
      );
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

async function ensureConsentSchema(): Promise<boolean> {
  const connectionString =
    process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) return false;

  const pool = new pg.Pool({ connectionString });
  try {
    const check = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'date_of_birth'`,
    );
    if (check.rowCount && check.rowCount > 0) return true;

    const patchPath = path.join(
      import.meta.dirname,
      "../scripts/db/patches/019-consent-compliance.sql",
    );
    const sql = fs.readFileSync(patchPath, "utf8");
    await pool.query(sql);
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

async function createConsentApp(): Promise<Express> {
  const { storageReady } = await import("../server/storage.ts");
  await storageReady;
  const { registerConsentRoutes } = await import("../server/consent-routes.ts");
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  registerConsentRoutes(app);
  return app;
}

const adultPayload = {
  dateOfBirth: "1990-01-15",
  consentProfile: true,
  consentTerms: true,
  consentAge: true,
  consentVersion: LEGAL_CONFIG.documentVersion,
};

describe("consent API routes (HTTP)", { skip: !hasDb }, () => {
  let app: Express;

  before(async () => {
    app = await createConsentApp();
  });

  it("GET /api/legal/config returns company disclosure fields", async () => {
    const res = await request(app, "GET", "/api/legal/config");
    assert.equal(res.status, 200);
    assert.equal(res.json?.cin, LEGAL_CONFIG.cin);
    assert.deepEqual(res.json?.grievanceOfficer, LEGAL_CONFIG.grievanceOfficer);
    assert.match(String(res.json?.registeredOfficeFormatted), /560060/);
  });

  it("POST /api/auth/onboarding-consent accepts an adult DOB and sets pending cookie", async () => {
    const res = await request(app, "POST", "/api/auth/onboarding-consent", {
      body: adultPayload,
    });
    assert.equal(res.status, 200);
    assert.equal(res.json?.ok, true);
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie);
    const joined = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    assert.match(joined, /awy_pending_consent=/);
  });

  it("POST /api/auth/onboarding-consent rejects under-18 DOB", async () => {
    const res = await request(app, "POST", "/api/auth/onboarding-consent", {
      body: { ...adultPayload, dateOfBirth: "2015-06-01" },
    });
    assert.equal(res.status, 403);
    assert.equal(res.json?.code, "underage");
    assert.equal(res.json?.grievanceEmail, LEGAL_CONFIG.grievanceOfficer.email);
  });

  it("POST /api/auth/onboarding-consent rejects missing checkboxes", async () => {
    const res = await request(app, "POST", "/api/auth/onboarding-consent", {
      body: { dateOfBirth: "1990-01-15", consentProfile: false },
    });
    assert.equal(res.status, 400);
  });

  it("GET /api/users/me/consent requires authentication", async () => {
    const res = await request(app, "GET", "/api/users/me/consent");
    assert.equal(res.status, 401);
  });
});

describe("consent API with persisted user records", { skip: !hasDb }, () => {
  let app: Express;
  let authToken: string;
  let schemaReady = false;

  before(async () => {
    schemaReady = await ensureConsentSchema();
    if (!schemaReady) return;

    app = await createConsentApp();
    const { storage } = await import("../server/storage.ts");
    const { generateToken } = await import("../server/auth.ts");

    const testUserEmail = `consent-test-${Date.now()}@example.com`;
    const user = await storage.createUser({
      email: testUserEmail,
      password: "",
      name: "Consent Test User",
      primaryMobile: null,
      primaryMobileCountryCode: "+91",
      secondaryMobile: null,
      secondaryMobileCountryCode: "+91",
      emergencyMobile: null,
      emergencyMobileCountryCode: "+91",
    });

    authToken = generateToken(user.id);

    await storage.recordRegistrationConsents({
      userId: user.id,
      dateOfBirth: adultPayload.dateOfBirth,
      consentVersion: consentVersion(),
    });
  });

  it("GET /api/users/me/consent returns registration consent categories and requirement", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");
    const res = await request(app, "GET", "/api/users/me/consent", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const categories = res.json?.categories as Array<{
      consentType: string;
      status: string;
    }>;
    assert.ok(Array.isArray(categories));
    const profile = categories.find((c) => c.consentType === "profile_booking");
    const terms = categories.find((c) => c.consentType === "terms");
    const age = categories.find((c) => c.consentType === "age_declaration");
    assert.equal(profile?.status, "active");
    assert.equal(terms?.status, "active");
    assert.equal(age?.status, "active");
    const health = categories.find((c) => c.consentType === "health_data");
    assert.equal(health?.status, "not_given");

    const requirement = res.json?.requirement as {
      requiresConsent: boolean;
      flow: string | null;
      requiredTypes: string[];
      requireDateOfBirth: boolean;
    };
    assert.ok(requirement);
    assert.equal(requirement.requiresConsent, false);
    assert.equal(requirement.flow, null);
    assert.deepEqual(requirement.requiredTypes, []);
    assert.equal(requirement.requireDateOfBirth, false);
    assert.equal(res.json?.hasDateOfBirth, true);
  });

  it("POST /api/users/me/consent/complete is a no-op when consent is already complete", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");
    const res = await request(app, "POST", "/api/users/me/consent/complete", {
      headers: { Authorization: `Bearer ${authToken}` },
      body: {},
    });
    assert.equal(res.status, 200);
    assert.equal(res.json?.ok, true);
  });

  it("POST /api/users/me/consent/health-data/withdraw succeeds without prior health consent", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");
    const res = await request(app, "POST", "/api/users/me/consent/health-data/withdraw", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
  });

  it("POST /api/users/me/consent/complete records first_time onboarding consents", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");
    const { storage } = await import("../server/storage.ts");
    const { generateToken } = await import("../server/auth.ts");

    const freshUser = await storage.createUser({
      email: `consent-first-${Date.now()}@example.com`,
      password: "",
      name: "First Time Consent",
      primaryMobile: null,
      primaryMobileCountryCode: "+91",
      secondaryMobile: null,
      secondaryMobileCountryCode: "+91",
      emergencyMobile: null,
      emergencyMobileCountryCode: "+91",
    });
    const freshToken = generateToken(freshUser.id);

    const before = await request(app, "GET", "/api/users/me/consent", {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.equal(before.status, 200);
    const beforeReq = before.json?.requirement as { requiresConsent: boolean; flow: string };
    assert.equal(beforeReq.requiresConsent, true);
    assert.equal(beforeReq.flow, "first_time");

    const complete = await request(app, "POST", "/api/users/me/consent/complete", {
      headers: { Authorization: `Bearer ${freshToken}` },
      body: adultPayload,
    });
    assert.equal(complete.status, 200);
    assert.equal(complete.json?.ok, true);

    const logs = await storage.getConsentLogsForUser(freshUser.id);
    const registrationTypes = logs
      .filter((log) =>
        ["profile_booking", "terms", "age_declaration"].includes(log.consentType),
      )
      .map((log) => log.consentType)
      .sort();
    assert.deepEqual(registrationTypes, [
      "age_declaration",
      "profile_booking",
      "terms",
    ]);
    assert.equal(
      logs.filter((log) => log.action === "opt_in").length,
      3,
      "expected three opt_in consent_audit_logs rows",
    );

    const after = await request(app, "GET", "/api/users/me/consent", {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    const afterReq = after.json?.requirement as { requiresConsent: boolean; flow: string | null };
    assert.equal(afterReq.requiresConsent, false);
    assert.equal(afterReq.flow, null);
  });

  it("POST /api/users/me/consent/complete records reconsent for outdated policy version", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");
    const { storage } = await import("../server/storage.ts");
    const { generateToken } = await import("../server/auth.ts");

    const outdatedVersion = "v0.0.0_outdated_test";
    const reconsentUser = await storage.createUser({
      email: `consent-reconsent-${Date.now()}@example.com`,
      password: "",
      name: "Reconsent User",
      primaryMobile: null,
      primaryMobileCountryCode: "+91",
      secondaryMobile: null,
      secondaryMobileCountryCode: "+91",
      emergencyMobile: null,
      emergencyMobileCountryCode: "+91",
    });
    await storage.recordRegistrationConsents({
      userId: reconsentUser.id,
      dateOfBirth: adultPayload.dateOfBirth,
      consentVersion: outdatedVersion,
    });
    const reconsentToken = generateToken(reconsentUser.id);

    const before = await request(app, "GET", "/api/users/me/consent", {
      headers: { Authorization: `Bearer ${reconsentToken}` },
    });
    const beforeReq = before.json?.requirement as {
      requiresConsent: boolean;
      flow: string;
      requiredTypes: string[];
    };
    assert.equal(beforeReq.requiresConsent, true);
    assert.equal(beforeReq.flow, "reconsent");
    assert.ok(beforeReq.requiredTypes.length > 0);

    const complete = await request(app, "POST", "/api/users/me/consent/complete", {
      headers: { Authorization: `Bearer ${reconsentToken}` },
      body: {
        consentProfile: true,
        consentTerms: true,
        consentAge: true,
        consentVersion: LEGAL_CONFIG.documentVersion,
      },
    });
    assert.equal(complete.status, 200);
    assert.equal(complete.json?.ok, true);

    const after = await request(app, "GET", "/api/users/me/consent", {
      headers: { Authorization: `Bearer ${reconsentToken}` },
    });
    const afterReq = after.json?.requirement as { requiresConsent: boolean; flow: string | null };
    assert.equal(afterReq.requiresConsent, false);
    assert.equal(afterReq.flow, null);
  });

  it("POST /api/users/me/erase requires ERASE confirmation payload", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");
    const res = await request(app, "POST", "/api/users/me/erase", {
      headers: { Authorization: `Bearer ${authToken}` },
      body: { confirmation: "NOPE", acknowledged: true },
    });
    assert.equal(res.status, 400);
  });
});
