/**
 * DB-backed erasure/withdrawal lifecycle coverage.
 * Run: npm test
 */
import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import express, { type Express } from "express";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import pg from "pg";
import { and, eq } from "drizzle-orm";
import "dotenv/config";
import { LEGAL_CONFIG } from "../shared/legal-config.ts";
import { consentVersion, ERASURE_GRACE_DAYS } from "../server/consent.ts";

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
  pathName: string,
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
        { hostname: "127.0.0.1", port, path: pathName, method, headers: reqHeaders },
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
      req.on("error", (error) => {
        server.close();
        reject(error);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

async function ensureComplianceSchema(): Promise<boolean> {
  const connectionString =
    process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) return false;

  const pool = new pg.Pool({ connectionString });
  try {
    const consentCheck = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'date_of_birth'`,
    );
    if (!consentCheck.rowCount) {
      const consentPatchPath = path.join(
        import.meta.dirname,
        "../scripts/db/patches/019-consent-compliance.sql",
      );
      await pool.query(fs.readFileSync(consentPatchPath, "utf8"));
    }

    const erasureCheck = await pool.query(
      `SELECT is_nullable
       FROM information_schema.columns
       WHERE table_name = 'erasure_requests' AND column_name = 'user_id'`,
    );
    const isNullable = erasureCheck.rows[0]?.is_nullable === "YES";
    if (!isNullable) {
      const erasurePatchPath = path.join(
        import.meta.dirname,
        "../scripts/db/patches/023-erasure-executor.sql",
      );
      await pool.query(fs.readFileSync(erasurePatchPath, "utf8"));
    }

    const consentConstraint = await pool.query(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conname = 'consent_audit_logs_actor_check'`,
    );
    const allowsRetainedLogs = String(consentConstraint.rows[0]?.definition ?? "").includes(
      "user_id IS NULL AND booking_id IS NULL",
    );
    if (!allowsRetainedLogs) {
      const consentRetentionPatchPath = path.join(
        import.meta.dirname,
        "../scripts/db/patches/024-consent-log-retention.sql",
      );
      await pool.query(fs.readFileSync(consentRetentionPatchPath, "utf8"));
    }

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

async function createFullApp(): Promise<Express> {
  const { registerRoutes } = await import("../server/routes.ts");
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  await registerRoutes(app);
  return app;
}

async function createMember(label: string) {
  const { storage } = await import("../server/storage.ts");
  const { generateToken } = await import("../server/auth.ts");

  const user = await storage.createUser({
    email: `erasure-${label}-${Date.now()}@example.com`,
    password: "",
    name: `Erasure ${label}`,
    primaryMobile: null,
    primaryMobileCountryCode: "+91",
    secondaryMobile: null,
    secondaryMobileCountryCode: "+91",
    emergencyMobile: null,
    emergencyMobileCountryCode: "+91",
  });

  const token = generateToken(user.id);
  return { user, token };
}

function localHealthFilePath(objectPath: string): string {
  const match = objectPath.match(/^\/objects\/health-documents\/([^/]+)\/([^/]+)$/);
  assert.ok(match, `expected local health object path, got ${objectPath}`);
  return path.join(process.cwd(), "data", "health-documents", match[1], match[2]);
}

async function seedClassFixtures(label: string) {
  const { storage } = await import("../server/storage.ts");

  const classType = await storage.createClassType({
    name: `Erasure Fixture ${label}`,
    description: "Fixture for erasure lifecycle tests",
    price: "500.00",
    duration: 60,
    intensity: "Moderate",
  });

  const instructor = await storage.createInstructor({
    name: `Instructor ${label}`,
    bio: null,
    imageUrl: null,
    specialties: null,
    email: null,
    phone: null,
    emailVerified: false,
    verificationMethod: "pending",
    phoneVerified: false,
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    emailVerificationToken: null,
    onboardingQrImageUrl: null,
    status: "pending",
    statusNotes: null,
    ycbRegistrationNumber: null,
    ycbLicenseStatus: "pending",
    ycbAdminComment: null,
    yogaAllianceRegistrationNumber: null,
    yogaAllianceLicenseStatus: "pending",
    yogaAllianceAdminComment: null,
  });

  const futureClass = await storage.createClass({
    classTypeId: classType.id,
    instructorId: instructor.id,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxCapacity: 8,
  });

  const pastClass = await storage.createClass({
    classTypeId: classType.id,
    instructorId: instructor.id,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    maxCapacity: 8,
  });

  return { futureClass, pastClass };
}

async function seedHealthWithdrawalFixture(label: string) {
  const { storage } = await import("../server/storage.ts");
  const { db } = await import("../server/db.ts");
  const { userDocuments } = await import("../shared/schema.ts");
  const { saveLocalHealthDocument } = await import("../server/localHealthStorage.ts");

  const { user, token } = await createMember(`withdraw-${label}`);

  await storage.updateUser(user.id, {
    primaryMobile: "9999999999",
    primaryMobileCountryCode: "+91",
    emergencyMobile: "8888888888",
    emergencyMobileCountryCode: "+91",
    dateOfBirth: "1990-01-15",
  } as never);

  await storage.recordRegistrationConsents({
    userId: user.id,
    dateOfBirth: "1990-01-15",
    consentVersion: consentVersion(),
  });

  await storage.insertConsentLog({
    userId: user.id,
    consentType: "health_data",
    action: "opt_in",
    consentVersion: consentVersion(),
  });

  const documentUrlOne = await saveLocalHealthDocument(user.id, Buffer.from(`health-one-${label}`));
  const documentUrlTwo = await saveLocalHealthDocument(user.id, Buffer.from(`health-two-${label}`));
  const documentUrls = [documentUrlOne, documentUrlTwo];
  await storage.updateUserHealthData(user.id, {
    healthUpdateText: "Lower back pain; please offer modifications.",
    healthDocumentUrls: documentUrls,
    healthUpdateHistory: [
      {
        text: "Earlier note",
        savedAt: "2026-06-01T10:00:00.000Z",
        documentUrls: ["health://history/prior.pdf"],
      },
    ],
    profileCompletionStatus: "complete",
    healthUpdateLastModified: "2026-07-01T10:00:00.000Z",
  });

  await db.insert(userDocuments).values([
    {
      userId: user.id,
      fileName: "one.pdf",
      fileType: "application/pdf",
      fileSize: 128,
      storageProvider: "local",
      storageKey: documentUrlOne,
      checksum: "a".repeat(64),
    },
    {
      userId: user.id,
      fileName: "two.pdf",
      fileType: "application/pdf",
      fileSize: 256,
      storageProvider: "local",
      storageKey: documentUrlTwo,
      checksum: "b".repeat(64),
    },
  ]);

  const { futureClass, pastClass } = await seedClassFixtures(`withdraw-${label}`);
  const futureBooking = await storage.createBooking({
    classId: futureClass.id,
    userId: user.id,
    paymentStatus: "paid",
  });
  const pastBooking = await storage.createBooking({
    classId: pastClass.id,
    userId: user.id,
    paymentStatus: "paid",
  });
  const payment = await storage.createPayment({
    bookingId: futureBooking.id,
    userId: user.id,
    classId: futureClass.id,
    amountPaise: 50000,
    currency: "INR",
    status: "paid",
    adminDisposition: "pending",
  });

  return { user, token, futureBooking, pastBooking, payment, documentUrls };
}

async function seedErasureFixture(label: string) {
  const { storage } = await import("../server/storage.ts");
  const { db } = await import("../server/db.ts");
  const { userSessionMappings } = await import("../shared/schema.ts");

  const { user, token } = await createMember(`erase-${label}`);
  await storage.recordRegistrationConsents({
    userId: user.id,
    dateOfBirth: "1990-01-15",
    consentVersion: consentVersion(),
  });

  const { futureClass, pastClass } = await seedClassFixtures(`erase-${label}`);
  await storage.createBooking({
    classId: futureClass.id,
    userId: user.id,
    paymentStatus: "paid",
  });
  await storage.createBooking({
    classId: pastClass.id,
    userId: user.id,
    paymentStatus: "paid",
  });

  const [futureMapping] = await db
    .select()
    .from(userSessionMappings)
    .where(and(eq(userSessionMappings.userId, user.id), eq(userSessionMappings.classId, futureClass.id)));
  const [pastMapping] = await db
    .select()
    .from(userSessionMappings)
    .where(and(eq(userSessionMappings.userId, user.id), eq(userSessionMappings.classId, pastClass.id)));

  return { user, token, futureClass, pastClass, futureMapping, pastMapping };
}

describe("health withdrawal lifecycle", { skip: !hasDb }, () => {
  let app: Express;
  let schemaReady = false;

  before(async () => {
    schemaReady = await ensureComplianceSchema();
    if (!schemaReady) return;
    app = await createConsentApp();
  });

  it("deletes stored health data and documents while leaving bookings, payments, and non-health fields intact", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { user, token, futureBooking, payment, documentUrls } =
      await seedHealthWithdrawalFixture("metadata");
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const beforeUser = await storage.getUser(user.id);
    const beforePayment = await storage.getPaymentByBookingId(futureBooking.id);
    assert.ok(beforeUser);
    assert.ok(beforePayment);

    try {
      const withdraw = await request(app, "POST", "/api/users/me/consent/health-data/withdraw", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "qa-erasure-suite/1.0",
          "X-Forwarded-For": "198.51.100.24, 10.0.0.1",
        },
      });
      assert.equal(withdraw.status, 200);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    const afterUser = await storage.getUser(user.id);
    assert.ok(afterUser);
    assert.equal(afterUser!.healthUpdateText, null);
    assert.equal(afterUser!.healthDocumentUrls, null);
    assert.deepEqual(afterUser!.healthUpdateHistory, []);
    assert.equal(afterUser!.healthUpdateLastModified, null);
    assert.equal(afterUser!.profileCompletionStatus, "incomplete");
    assert.equal(afterUser!.name, beforeUser!.name);
    assert.equal(afterUser!.email, beforeUser!.email);
    assert.equal(afterUser!.primaryMobile, beforeUser!.primaryMobile);
    assert.equal(afterUser!.emergencyMobile, beforeUser!.emergencyMobile);
    assert.equal(afterUser!.dateOfBirth, beforeUser!.dateOfBirth);

    const afterBooking = await storage.getBooking(futureBooking.id);
    const afterPayment = await storage.getPaymentByBookingId(futureBooking.id);
    assert.equal(afterBooking?.paymentStatus, futureBooking.paymentStatus);
    assert.equal(afterPayment?.id, payment.id);
    assert.equal(afterPayment?.status, beforePayment?.status);
    assert.equal(afterPayment?.amountPaise, beforePayment?.amountPaise);
    assert.equal((await storage.getUserDocuments(user.id)).length, 0);
    for (const objectPath of documentUrls) {
      assert.equal(fs.existsSync(localHealthFilePath(objectPath)), false);
    }

    const consentRes = await request(app, "GET", "/api/users/me/consent", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(consentRes.status, 200);
    const categories = consentRes.json?.categories as Array<{
      consentType: string;
      status: string;
    }>;
    const health = categories.find((row) => row.consentType === "health_data");
    assert.equal(health?.status, "withdrawn");

    const logs = await storage.getConsentLogsForUser(user.id);
    const healthOptOut = logs.find(
      (row) =>
        row.consentType === "health_data" &&
        row.action === "opt_out" &&
        row.userAgent === "qa-erasure-suite/1.0",
    );
    assert.ok(healthOptOut);
    assert.equal(healthOptOut?.consentVersion, consentVersion());
    assert.equal(healthOptOut?.ipAddress, "198.51.100.24");
  });

  it("rejects unauthenticated and guest-checkout scoped tokens", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");

    const { generateGuestCheckoutToken } = await import("../server/auth.ts");

    const unauthenticated = await request(app, "POST", "/api/users/me/consent/health-data/withdraw");
    assert.equal(unauthenticated.status, 401);

    const guestScoped = await request(app, "POST", "/api/users/me/consent/health-data/withdraw", {
      headers: { Authorization: `Bearer ${generateGuestCheckoutToken("booking-guest-1")}` },
    });
    assert.equal(guestScoped.status, 401);
  });
});

describe("account erasure lifecycle", { skip: !hasDb }, () => {
  let app: Express;
  let schemaReady = false;

  before(async () => {
    schemaReady = await ensureComplianceSchema();
    if (!schemaReady) return;
    app = await createConsentApp();
  });

  it("creates a pending erasure request, clears the auth cookie, deactivates the user, and cancels only future mappings", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { db } = await import("../server/db.ts");
    const { erasureRequests, userSessionMappings } = await import("../shared/schema.ts");
    const { user, token, futureClass, pastClass } = await seedErasureFixture("happy");

    const res = await request(app, "POST", "/api/users/me/erase", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "qa-erasure-suite/1.0",
        "X-Forwarded-For": "203.0.113.55, 10.0.0.5",
      },
      body: { confirmation: "ERASE", acknowledged: true },
    });

    assert.equal(res.status, 200);
    assert.equal(res.json?.timelineDays, ERASURE_GRACE_DAYS);
    assert.equal(typeof res.json?.erasureRequestId, "string");
    assert.equal(typeof res.json?.scheduledErasureAt, "string");
    const setCookie = res.headers["set-cookie"];
    const joined = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie ?? "");
    assert.match(joined, /authToken=;/);

    const pending = await storage.getPendingErasureForUser(user.id);
    assert.ok(pending);
    assert.equal(pending?.id, res.json?.erasureRequestId);
    assert.equal(pending?.scheduledErasureAt.toISOString(), res.json?.scheduledErasureAt);
    assert.equal(pending?.ipAddress, "203.0.113.55");
    assert.equal(pending?.userAgent, "qa-erasure-suite/1.0");

    const userAfter = await storage.getUser(user.id);
    assert.equal(userAfter?.isActive, false);

    const [futureMapping] = await db
      .select()
      .from(userSessionMappings)
      .where(and(eq(userSessionMappings.userId, user.id), eq(userSessionMappings.classId, futureClass.id)));
    const [pastMapping] = await db
      .select()
      .from(userSessionMappings)
      .where(and(eq(userSessionMappings.userId, user.id), eq(userSessionMappings.classId, pastClass.id)));
    const futureClassAfter = await storage.getClass(futureClass.id);
    const pastClassAfter = await storage.getClass(pastClass.id);

    assert.equal(futureMapping?.status, "cancelled");
    assert.ok(futureMapping?.cancelledAt instanceof Date);
    assert.notEqual(pastMapping?.status, "cancelled");
    assert.equal(pastMapping?.cancelledAt ?? null, null);
    assert.equal(futureClassAfter?.currentBookings, 0);
    assert.equal(pastClassAfter?.currentBookings, 1);

    const logs = await storage.getConsentLogsForUser(user.id);
    const optOutTypes = logs
      .filter((row) => row.action === "opt_out")
      .map((row) => row.consentType)
      .sort();
    assert.deepEqual(optOutTypes, ["age_declaration", "profile_booking", "terms"]);

    const pendingRows = await db
      .select()
      .from(erasureRequests)
      .where(and(eq(erasureRequests.userId, user.id), eq(erasureRequests.status, "pending")));
    assert.equal(pendingRows.length, 1);
  });

  it("is idempotent while a pending erasure request exists", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { db } = await import("../server/db.ts");
    const { erasureRequests } = await import("../shared/schema.ts");
    const { user, token } = await seedErasureFixture("idempotent");

    const first = await request(app, "POST", "/api/users/me/erase", {
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: "ERASE", acknowledged: true },
    });
    const second = await request(app, "POST", "/api/users/me/erase", {
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: "ERASE", acknowledged: true },
    });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.json?.erasureRequestId, first.json?.erasureRequestId);
    assert.equal(second.json?.scheduledErasureAt, first.json?.scheduledErasureAt);

    const pendingRows = await db
      .select()
      .from(erasureRequests)
      .where(and(eq(erasureRequests.userId, user.id), eq(erasureRequests.status, "pending")));
    assert.equal(pendingRows.length, 1);

    const optOutCount = (await storage.getConsentLogsForUser(user.id)).filter(
      (row) => row.action === "opt_out",
    ).length;
    assert.equal(optOutCount, 3);
  });

  it("rejects invalid confirmation payloads with zero side effects", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { db } = await import("../server/db.ts");
    const { userSessionMappings } = await import("../shared/schema.ts");
    const { user, token, futureClass } = await seedErasureFixture("invalid");

    const res = await request(app, "POST", "/api/users/me/erase", {
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: "NOPE", acknowledged: true },
    });

    assert.equal(res.status, 400);
    assert.equal(await storage.getPendingErasureForUser(user.id), undefined);
    assert.equal((await storage.getUser(user.id))?.isActive, true);
    assert.equal(
      (await storage.getConsentLogsForUser(user.id)).filter((row) => row.action === "opt_out").length,
      0,
    );

    const [futureMapping] = await db
      .select()
      .from(userSessionMappings)
      .where(and(eq(userSessionMappings.userId, user.id), eq(userSessionMappings.classId, futureClass.id)));
    assert.notEqual(futureMapping?.status, "cancelled");
  });

  it("never mutates another user's record set when one user requests erasure", async (t) => {
    if (!schemaReady) t.skip("consent schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { user: targetUser, token } = await seedErasureFixture("target");
    const { user: controlUser } = await createMember("control");

    await storage.recordRegistrationConsents({
      userId: controlUser.id,
      dateOfBirth: "1990-01-15",
      consentVersion: consentVersion(),
    });
    await storage.insertConsentLog({
      userId: controlUser.id,
      consentType: "health_data",
      action: "opt_in",
      consentVersion: LEGAL_CONFIG.documentVersion,
    });
    await storage.updateUser(controlUser.id, {
      primaryMobile: "7777777777",
      primaryMobileCountryCode: "+91",
      emergencyMobile: "6666666666",
      emergencyMobileCountryCode: "+91",
      dateOfBirth: "1990-01-15",
    } as never);

    const beforeControl = await storage.getUser(controlUser.id);
    const beforeControlLogs = await storage.getConsentLogsForUser(controlUser.id);

    const res = await request(app, "POST", "/api/users/me/erase", {
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: "ERASE", acknowledged: true },
    });
    assert.equal(res.status, 200);

    const afterControl = await storage.getUser(controlUser.id);
    const afterControlLogs = await storage.getConsentLogsForUser(controlUser.id);
    const afterTarget = await storage.getUser(targetUser.id);

    assert.equal(afterTarget?.isActive, false);
    assert.deepEqual(
      {
        id: afterControl?.id,
        isActive: afterControl?.isActive,
        name: afterControl?.name,
        email: afterControl?.email,
        primaryMobile: afterControl?.primaryMobile,
        emergencyMobile: afterControl?.emergencyMobile,
        dateOfBirth: afterControl?.dateOfBirth,
      },
      {
        id: beforeControl?.id,
        isActive: beforeControl?.isActive,
        name: beforeControl?.name,
        email: beforeControl?.email,
        primaryMobile: beforeControl?.primaryMobile,
        emergencyMobile: beforeControl?.emergencyMobile,
        dateOfBirth: beforeControl?.dateOfBirth,
      },
    );
    assert.equal(afterControlLogs.length, beforeControlLogs.length);
  });
});

describe("erasure enforcement and completion", { skip: !hasDb }, () => {
  let app: Express;
  let schemaReady = false;

  before(async () => {
    schemaReady = await ensureComplianceSchema();
    if (!schemaReady) return;
    app = await createFullApp();
  });

  it("blocks profile and health updates for deactivated accounts with still-valid JWTs", async (t) => {
    if (!schemaReady) t.skip("compliance schema migration not applied");

    const { user, token } = await seedErasureFixture("write-guard");

    const erase = await request(app, "POST", "/api/users/me/erase", {
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: "ERASE", acknowledged: true },
    });
    assert.equal(erase.status, 200);

    const profileUpdate = await request(app, "PUT", "/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: "Still Trying",
        primaryMobile: "9999999999",
        primaryMobileCountryCode: "+91",
        emergencyMobile: "8888888888",
        emergencyMobileCountryCode: "+91",
      },
    });
    assert.equal(profileUpdate.status, 403);
    assert.equal(profileUpdate.json?.code, "account_deactivated");

    const healthUpdate = await request(app, "PATCH", `/api/users/${user.id}/health-update`, {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        healthDataConsent: true,
        healthUpdateText: "New health note after erasure request",
        healthDocumentUrls: [],
      },
    });
    assert.equal(healthUpdate.status, 403);
    assert.equal(healthUpdate.json?.code, "account_deactivated");
  });

  it("admin hard delete removes health files but retains consent audit evidence", async (t) => {
    if (!schemaReady) t.skip("compliance schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { db } = await import("../server/db.ts");
    const { consentAuditLogs, userDocuments } = await import("../shared/schema.ts");
    const { saveLocalHealthDocument } = await import("../server/localHealthStorage.ts");

    const { user } = await createMember("admin-delete");
    const objectPath = await saveLocalHealthDocument(user.id, Buffer.from("delete-me"));
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      await storage.recordRegistrationConsents({
        userId: user.id,
        dateOfBirth: "1990-01-15",
        consentVersion: consentVersion(),
      });
      await storage.insertConsentLog({
        userId: user.id,
        consentType: "health_data",
        action: "opt_in",
        consentVersion: consentVersion(),
      });
      await storage.updateUserHealthData(user.id, {
        healthUpdateText: "Delete my records",
        healthDocumentUrls: [objectPath],
        healthUpdateHistory: [],
        profileCompletionStatus: "complete",
        healthUpdateLastModified: new Date().toISOString(),
      });
      await db.insert(userDocuments).values({
        userId: user.id,
        fileName: "delete-me.pdf",
        fileType: "application/pdf",
        fileSize: 64,
        storageProvider: "local",
        storageKey: objectPath,
        checksum: "c".repeat(64),
      });

      const beforeLogs = await db
        .select()
        .from(consentAuditLogs)
        .where(eq(consentAuditLogs.userId, user.id));
      assert.ok(beforeLogs.length >= 1);

      const result = await storage.deleteUserPermanently(user.id);
      assert.equal(result.ok, true);
      assert.equal((await storage.getUser(user.id)) ?? null, null);
      assert.equal((await storage.getUserDocuments(user.id)).length, 0);
      assert.equal(fs.existsSync(localHealthFilePath(objectPath)), false);

      const retainedLogs = await db
        .select()
        .from(consentAuditLogs)
        .where(eq(consentAuditLogs.consentType, "health_data"));
      const retainedForDeletedUser = retainedLogs.find(
        (row) =>
          row.action === "opt_in" &&
          row.consentVersion === consentVersion() &&
          row.userId === null,
      );
      assert.ok(retainedForDeletedUser);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("processes overdue erasure requests to completion, deletes files, and keeps compliance evidence", async (t) => {
    if (!schemaReady) t.skip("compliance schema migration not applied");

    const { storage } = await import("../server/storage.ts");
    const { db } = await import("../server/db.ts");
    const { consentAuditLogs, erasureRequests, userDocuments } = await import("../shared/schema.ts");
    const { saveLocalHealthDocument } = await import("../server/localHealthStorage.ts");

    const { user } = await createMember("executor");
    const objectPath = await saveLocalHealthDocument(user.id, Buffer.from("erase-me"));
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      await storage.recordRegistrationConsents({
        userId: user.id,
        dateOfBirth: "1990-01-15",
        consentVersion: consentVersion(),
      });
      await storage.insertConsentLog({
        userId: user.id,
        consentType: "health_data",
        action: "opt_in",
        consentVersion: consentVersion(),
      });
      await storage.updateUserHealthData(user.id, {
        healthUpdateText: "Executor fixture",
        healthDocumentUrls: [objectPath],
        healthUpdateHistory: [],
        profileCompletionStatus: "complete",
        healthUpdateLastModified: new Date().toISOString(),
      });
      await db.insert(userDocuments).values({
        userId: user.id,
        fileName: "erase-me.pdf",
        fileType: "application/pdf",
        fileSize: 64,
        storageProvider: "local",
        storageKey: objectPath,
        checksum: "d".repeat(64),
      });

      const erasure = await storage.requestAccountErasure({ userId: user.id });
      await db
        .update(erasureRequests)
        .set({ scheduledErasureAt: new Date("2026-01-01T00:00:00.000Z") })
        .where(eq(erasureRequests.id, erasure.erasureRequestId));

      const processed = await storage.processDueAccountErasures(new Date("2026-01-31T00:00:00.000Z"));
      assert.equal(processed, 1);
      assert.equal((await storage.getUser(user.id)) ?? null, null);
      assert.equal(fs.existsSync(localHealthFilePath(objectPath)), false);

      const [completedRow] = await db
        .select()
        .from(erasureRequests)
        .where(eq(erasureRequests.id, erasure.erasureRequestId));
      assert.ok(completedRow);
      assert.equal(completedRow.status, "completed");
      assert.ok(completedRow.completedAt instanceof Date);
      assert.equal(completedRow.userId, null);

      const retainedLogs = await db
        .select()
        .from(consentAuditLogs)
        .where(eq(consentAuditLogs.consentType, "health_data"));
      assert.ok(retainedLogs.some((row) => row.userId === null && row.action === "opt_in"));
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});

after(async () => {
  if (!hasDb) return;
  const { purgeQaFixturesFromDb } = await import("../scripts/db/purge-qa-fixtures-core.ts");
  await purgeQaFixturesFromDb();
});
