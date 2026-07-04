/**
 * Regression sanity suite — run after every fix: npm test
 * Covers admin auth, member booking, booking flow, payment helpers, profile rules.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("sanity: shared schemas", async () => {
  const { memberBookingBodySchema, insertBookingSchema } = await import("../shared/schema.ts");
  it("member booking accepts classId only", () => {
    assert.equal(memberBookingBodySchema.safeParse({ classId: "s1" }).success, true);
  });
  it("insert booking accepts guest checkout without userId", () => {
    assert.equal(
      insertBookingSchema.safeParse({
        classId: "s1",
        isGuestCheckout: true,
        guestEmail: "guest@example.com",
        guestName: "Guest",
      }).success,
      true,
    );
  });
});

describe("sanity: admin bootstrap", async () => {
  const { normalizeAdminEmail, getAdminBootstrapConfig } = await import("../server/admin-bootstrap.ts");
  it("email normalization", () => {
    assert.equal(normalizeAdminEmail(" A@B.com "), "a@b.com");
  });
  it("bootstrap config shape when env set", () => {
    const prev = process.env.ADMIN_INITIAL_PASSWORD;
    process.env.ADMIN_INITIAL_PASSWORD = "sanity-test-password";
    const cfg = getAdminBootstrapConfig();
    if (prev === undefined) delete process.env.ADMIN_INITIAL_PASSWORD;
    else process.env.ADMIN_INITIAL_PASSWORD = prev;
    assert.ok(cfg?.password);
    assert.ok(cfg?.email.includes("@"));
  });
});

describe("sanity: booking flow", async () => {
  const { isSessionUpcoming, filterBookableSessions, normalizeBookingIntent } = await import(
    "../client/src/lib/booking-flow.ts"
  );
  const now = new Date("2026-06-01T12:00:00Z");
  it("filters past sessions from dropdown", () => {
    const list = filterBookableSessions(
      [
        { date: "2026-06-02T10:00:00Z", currentBookings: 0, maxCapacity: 10 },
        { date: "2026-05-01T10:00:00Z", currentBookings: 0, maxCapacity: 10 },
      ],
      now,
    );
    assert.equal(list.length, 1);
  });
  it("schedule vs teach intents", () => {
    assert.equal(normalizeBookingIntent("sess-1").sessionId, "sess-1");
    assert.equal(normalizeBookingIntent({ classTypeId: "t1" }).scrollTo, "teach");
  });
  it("upcoming check", () => {
    assert.equal(isSessionUpcoming("2026-06-02T10:00:00Z", now), true);
  });
});

describe("sanity: payment helpers", async () => {
  const { formatSessionPrice, isValidPaymentUrl } = await import("../client/src/lib/booking-payment.ts");
  it("formats price", () => assert.equal(formatSessionPrice("500"), "₹500"));
  it("validates razorpay url", () =>
    assert.equal(isValidPaymentUrl("https://rzp.io/l/test"), true),
  );
});

describe("sanity: profile completeness", async () => {
  const { isAccountProfileComplete } = await import("../shared/profileCompleteness.ts");
  it("incomplete without health text", () => {
    assert.equal(
      isAccountProfileComplete({
        emailVerified: true,
        name: "Test",
        primaryMobile: "9999999999",
        primaryMobileCountryCode: "+91",
        secondaryMobile: null,
        secondaryMobileCountryCode: "+91",
        emergencyMobile: "8888888888",
        emergencyMobileCountryCode: "+91",
        healthUpdateText: "",
      }),
      false,
    );
  });
});

describe("sanity: payment QR validation", async () => {
  const { adminPaymentQrCodeSchema } = await import("../shared/admin-validation.ts");
  it("accepts data URL for admin QR upload", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "UPI",
      imageUrl: "data:image/png;base64,iVBORw0KGgo=",
      contactPhone: "+919876543210",
      contactEmail: "pay@andweyoga.com",
    });
    assert.equal(result.success, true);
  });
  it("rejects missing image", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "UPI",
      imageUrl: "",
      contactPhone: "+919876543210",
      contactEmail: "pay@andweyoga.com",
    });
    assert.equal(result.success, false);
  });
});

describe("sanity: admin validation", async () => {
  const { adminCreateClassSessionSchema, adminCreateClassTypeSchema } = await import(
    "../shared/admin-validation.ts"
  );

  it("requires session type image on create", () => {
    const missing = adminCreateClassTypeSchema.safeParse({
      name: "Vinyasa Flow",
      description: "A dynamic flowing practice for all levels.",
      price: "500",
      duration: 60,
      imageUrl: "",
      intensity: "Moderate",
    });
    assert.equal(missing.success, false);

    const ok = adminCreateClassTypeSchema.safeParse({
      name: "Vinyasa Flow",
      description: "A dynamic flowing practice for all levels.",
      price: "500",
      duration: 60,
      imageUrl: "https://cdn.example.com/vinyasa.jpg",
      intensity: "Moderate",
    });
    assert.equal(ok.success, true);
  });

  it("accepts session create with required meet link and razorpay payment", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      classTypeId: "00000000-0000-0000-0000-000000000001",
      instructorId: "00000000-0000-0000-0000-000000000002",
      date: new Date(Date.now() + 86400000),
      maxCapacity: 10,
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/example",
      publishMode: "now",
    });
    assert.equal(result.success, true);
  });

  it("rejects session create without meet link", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      classTypeId: "00000000-0000-0000-0000-000000000001",
      instructorId: "00000000-0000-0000-0000-000000000002",
      date: new Date(Date.now() + 86400000),
      maxCapacity: 10,
      googleMeetLink: "",
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/example",
      publishMode: "now",
    });
    assert.equal(result.success, false);
  });
});
