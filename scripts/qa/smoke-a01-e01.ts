/**
 * API smoke for Epic A-01 (payment hold) + E-01 (strictNoTo).
 *
 * Creates tagged fixtures (Smoke QA …), asserts API behaviour, then ALWAYS cleans up
 * unless QA_SMOKE_SKIP_CLEANUP=1 (for manual browser inspection — run qa:smoke-cleanup after).
 *
 * Prerequisites: DATABASE_URL set; dev server on BASE_URL (default http://localhost:3000).
 * QA_INTERNAL_API_TOKEN in .env (same value sent as X-AWY-QA-Internal for fixture booking API checks).
 *
 * Usage:
 *   npm run qa:smoke-a01-e01
 *   QA_SMOKE_SKIP_CLEANUP=1 npm run qa:smoke-a01-e01   # browser pass, then npm run qa:smoke-cleanup
 */
import "dotenv/config";
import { pool } from "../../server/db.ts";
import { storage } from "../../server/storage.ts";
import {
  QA_SMOKE_CLASS_TYPE_PREFIX,
  QA_SMOKE_INSTRUCTOR_PREFIX,
} from "../../shared/seed-catalog.ts";
import { PAYMENT_HOLD_MINUTES } from "../../shared/booking-payment-hold.ts";
import { GUEST_CHECKOUT_SETTING_KEY } from "../../shared/platform-settings.ts";
import {
  bustGuestCheckoutCache,
  getGuestCheckoutEnabled,
} from "../../server/platform-settings.ts";
import { getAdminBootstrapConfig } from "../../server/admin-bootstrap.ts";
import { purgeSmokeFixtures } from "./purge-smoke-fixtures.ts";

const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const SKIP_CLEANUP =
  process.env.QA_SMOKE_SKIP_CLEANUP === "1" || process.env.QA_SMOKE_SKIP_CLEANUP === "true";

const SMOKE_STRICT_NO_TO = "High BP, Recent surgery";
const runId = Date.now();

interface SmokeContext {
  classTypeId: string;
  instructorId: string;
  sessionId: string;
  bookingId?: string;
  guestCheckoutWasEnabled: boolean;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function waitForServer(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/class-types`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Dev server not reachable at ${BASE_URL} — run npm run dev first.`);
}

async function seedSmokeFixtures(): Promise<SmokeContext> {
  const label = `${runId}`;
  const classType = await storage.createClassType({
    name: `${QA_SMOKE_CLASS_TYPE_PREFIX}${label}`,
    description: "Ephemeral smoke fixture — auto-deleted after qa:smoke-a01-e01",
    price: "500.00",
    duration: 60,
    intensity: "Moderate",
    strictNoTo: SMOKE_STRICT_NO_TO,
  });

  const instructor = await storage.createInstructor({
    name: `${QA_SMOKE_INSTRUCTOR_PREFIX}${label}`,
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
    status: "active",
    statusNotes: null,
    ycbRegistrationNumber: null,
    ycbLicenseStatus: "pending",
    ycbAdminComment: null,
    yogaAllianceRegistrationNumber: null,
    yogaAllianceLicenseStatus: "pending",
    yogaAllianceAdminComment: null,
  });

  const session = await storage.createClass({
    classTypeId: classType.id,
    instructorId: instructor.id,
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    maxCapacity: 4,
    googleMeetLink: "https://meet.google.com/smoke-qa-test",
    paymentMethod: "razorpay_gateway",
    razorpayLink: null,
    sessionFrequency: "drop_in",
    status: "published",
    publishedAt: new Date(),
  });

  const persisted = await storage.getClass(session.id);
  assert(persisted?.sessionFrequency === "drop_in", "sessionFrequency must be drop_in for guest smoke");

  return {
    classTypeId: classType.id,
    instructorId: instructor.id,
    sessionId: session.id,
    guestCheckoutWasEnabled: await getGuestCheckoutEnabled(),
  };
}

async function resolvePlatformSettingsActorId(): Promise<string> {
  const bootstrap = getAdminBootstrapConfig();
  if (bootstrap) {
    const admin = await storage.getAdminByEmail(bootstrap.email);
    if (admin) return admin.id;
  }
  throw new Error(
    "No bootstrap admin found for platform_settings toggle — set ADMIN_INITIAL_PASSWORD in .env",
  );
}

async function ensureGuestCheckoutForSmoke(ctx: SmokeContext): Promise<void> {
  if (ctx.guestCheckoutWasEnabled) return;
  const actorId = await resolvePlatformSettingsActorId();
  await storage.upsertPlatformSetting(GUEST_CHECKOUT_SETTING_KEY, true, actorId);
  bustGuestCheckoutCache();
  assert(await getGuestCheckoutEnabled(), "failed to enable guest checkout for smoke");
  console.log("  · guest checkout temporarily enabled for smoke (restored in finally)");
}

async function restoreGuestCheckoutSetting(ctx: SmokeContext | null): Promise<void> {
  if (!ctx || ctx.guestCheckoutWasEnabled) return;
  try {
    const actorId = await resolvePlatformSettingsActorId();
    await storage.upsertPlatformSetting(GUEST_CHECKOUT_SETTING_KEY, false, actorId);
    bustGuestCheckoutCache();
    console.log("  · guest checkout restored to previous (disabled)");
  } catch (err) {
    console.warn("[qa:smoke-a01-e01] Could not restore guest checkout setting:", err);
  }
}

async function assertStrictNoToApi(classTypeId: string): Promise<void> {
  const classType = await storage.getClassType(classTypeId);
  assert(classType, "smoke class type missing from storage");
  assert(classType.strictNoTo === SMOKE_STRICT_NO_TO, "strictNoTo missing or wrong on fixture");
  const tags = classType.strictNoTo!.split(",").map((t) => t.trim()).filter(Boolean);
  assert(tags.length === 2, `expected 2 strictNoTo tags, got ${tags.length}`);
  console.log("  ✓ E-01 strictNoTo on smoke fixture (storage)");
}

function qaInternalHeaders(): Record<string, string> {
  const token = process.env.QA_INTERNAL_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "QA_INTERNAL_API_TOKEN must be set in .env for smoke guest booking API checks (dev only).",
    );
  }
  return { "X-AWY-QA-Internal": token };
}

async function assertGuestHoldAndCancel(ctx: SmokeContext): Promise<void> {
  const email = `smoke.qa.${runId}@example.com`;
  const createRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...qaInternalHeaders() },
    body: JSON.stringify({
      classId: ctx.sessionId,
      guestName: "Smoke QA Guest",
      guestEmail: email,
      guestPhone: "9876543210",
      guestConsentProfile: true,
      guestConsentTerms: true,
      guestConsentAge: true,
      consentVersion: "2026-01",
    }),
  });
  const createBody = (await createRes.json()) as {
    heldUntil?: string | null;
    booking?: { id?: string; heldUntil?: string | null };
    guestCheckoutToken?: string | null;
    paymentRequired?: boolean;
  };
  assert(createRes.status === 201, `guest booking failed (${createRes.status}): ${JSON.stringify(createBody)}`);
  assert(createBody.paymentRequired === true, "expected paymentRequired for paid drop-in");
  const heldUntil = createBody.heldUntil ?? createBody.booking?.heldUntil ?? null;
  assert(heldUntil, "A-01: heldUntil missing on new paid guest booking");
  const bookingId = createBody.booking?.id;
  assert(bookingId, "booking id missing");
  ctx.bookingId = bookingId;

  const expiryMs = new Date(heldUntil).getTime() - Date.now();
  const expectedMs = PAYMENT_HOLD_MINUTES * 60 * 1000;
  assert(
    Math.abs(expiryMs - expectedMs) < 90_000,
    `heldUntil should be ~${PAYMENT_HOLD_MINUTES}m from now (delta ${Math.round(expiryMs / 1000)}s)`,
  );
  console.log("  ✓ A-01 heldUntil on POST /api/bookings (guest paid session)");

  const token = createBody.guestCheckoutToken;
  assert(token, "guestCheckoutToken missing");
  const cancelRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/cancel-checkout`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cancelBody = (await cancelRes.json()) as { booking?: { heldUntil?: string | null; paymentStatus?: string } };
  assert(cancelRes.ok, `cancel-checkout failed (${cancelRes.status}): ${JSON.stringify(cancelBody)}`);
  assert(
    cancelBody.booking?.heldUntil == null,
    "heldUntil should be cleared after cancel-checkout",
  );
  console.log("  ✓ A-01 PATCH /api/bookings/:id/cancel-checkout releases hold");
}

function printBrowserHints(ctx: SmokeContext): void {
  console.log("\n--- Browser hints (optional manual pass) ---");
  console.log(`Home:        ${BASE_URL}/`);
  console.log(`Class type:  ${BASE_URL}/api/class-types/${ctx.classTypeId}`);
  console.log(`Reserve:     ${BASE_URL}/reserve?sessionId=${ctx.sessionId}&from=calendar`);
  console.log(`Admin login: ${BASE_URL}/admin/login → Session Types → look for "${QA_SMOKE_CLASS_TYPE_PREFIX}${runId}"`);
  console.log("--------------------------------------------\n");
}

async function main() {
  console.log(`[qa:smoke-a01-e01] BASE_URL=${BASE_URL}`);
  await purgeSmokeFixtures();
  await waitForServer();

  let ctx: SmokeContext | null = null;
  try {
    ctx = await seedSmokeFixtures();
    console.log("[qa:smoke-a01-e01] Fixtures seeded.");
    await ensureGuestCheckoutForSmoke(ctx);

    await assertStrictNoToApi(ctx.classTypeId);
    await assertGuestHoldAndCancel(ctx);
    printBrowserHints(ctx);

    console.log("[qa:smoke-a01-e01] All API checks passed.");
  } finally {
    await restoreGuestCheckoutSetting(ctx);
    if (!SKIP_CLEANUP) {
      await purgeSmokeFixtures();
      console.log("[qa:smoke-a01-e01] Smoke fixtures removed — slate clean.");
    } else {
      console.log(
        "[qa:smoke-a01-e01] QA_SMOKE_SKIP_CLEANUP set — run npm run qa:smoke-cleanup when done in browser.",
      );
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[qa:smoke-a01-e01] FAILED:", err);
  process.exit(1);
});
