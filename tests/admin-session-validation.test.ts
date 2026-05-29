/**
 * Create session form — front/back validation parity.
 * Run: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adminCreateClassSessionSchema } from "../shared/admin-validation.ts";

const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

function parseSession(body: Record<string, unknown>) {
  return adminCreateClassSessionSchema.safeParse(body);
}

describe("adminCreateClassSessionSchema — required fields", () => {
  it("rejects completely empty payload", () => {
    const r = parseSession({
      classTypeId: "",
      instructorId: "",
      date: "",
      maxCapacity: "",
      googleMeetLink: "",
      paymentMethod: "razorpay_link",
      razorpayLink: "",
      publishMode: "now",
    });
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      assert.ok(paths.includes("classTypeId"));
      assert.ok(paths.includes("instructorId"));
      assert.ok(paths.includes("date"));
      assert.ok(paths.includes("maxCapacity"));
      assert.ok(paths.includes("googleMeetLink"));
    }
  });

  it("rejects empty date string", () => {
    const r = parseSession({
      classTypeId: "ct-1",
      instructorId: "ins-1",
      date: "",
      maxCapacity: "10",
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/x",
      publishMode: "now",
    });
    assert.equal(r.success, false);
    if (!r.success) assert.ok(r.error.issues.some((i) => i.path[0] === "date"));
  });

  it("rejects http meet link", () => {
    const r = parseSession({
      classTypeId: "ct-1",
      instructorId: "ins-1",
      date: futureDate,
      maxCapacity: "10",
      googleMeetLink: "http://meet.google.com/abc",
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/x",
      publishMode: "now",
    });
    assert.equal(r.success, false);
  });

  it("rejects capacity 0 and empty capacity", () => {
    for (const cap of ["", "0"]) {
      const r = parseSession({
        classTypeId: "ct-1",
        instructorId: "ins-1",
        date: futureDate,
        maxCapacity: cap,
        googleMeetLink: "https://meet.google.com/abc-defg-hij",
        paymentMethod: "razorpay_link",
        razorpayLink: "https://rzp.io/i/x",
        publishMode: "now",
      });
      assert.equal(r.success, false, `capacity "${cap}" should fail`);
    }
  });
});

describe("adminCreateClassSessionSchema — field length", () => {
  it("rejects overly long meet link", () => {
    const r = parseSession({
      classTypeId: "ct-1",
      instructorId: "ins-1",
      date: futureDate,
      maxCapacity: "10",
      googleMeetLink: `https://meet.google.com/${"a".repeat(2100)}`,
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/x",
      publishMode: "now",
    });
    assert.equal(r.success, false);
  });
});

describe("adminCreateClassSessionSchema — Razorpay gateway", () => {
  it("accepts gateway without payment link or QR contact", () => {
    const r = parseSession({
      classTypeId: "ct-1",
      instructorId: "ins-1",
      date: futureDate,
      maxCapacity: "10",
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      paymentMethod: "razorpay_gateway",
      razorpayLink: null,
      publishMode: "now",
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.paymentMethod, "razorpay_gateway");
      assert.equal(r.data.razorpayLink, null);
    }
  });
});

describe("adminCreateClassSessionSchema — QR payment", () => {
  const base = {
    classTypeId: "ct-1",
    instructorId: "ins-1",
    date: futureDate,
    maxCapacity: "15",
    googleMeetLink: "https://meet.google.com/abc-defg-hij",
    paymentMethod: "qr" as const,
    publishMode: "now" as const,
  };

  it("requires QR code, phone, and email", () => {
    const r = parseSession({
      ...base,
      paymentQrCodeId: "",
      qrContactPhone: "",
      qrContactEmail: "",
    });
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      assert.ok(paths.includes("paymentQrCodeId"));
      assert.ok(paths.includes("qrContactPhone"));
      assert.ok(paths.includes("qrContactEmail"));
    }
  });

  it("rejects invalid phone and email", () => {
    const r = parseSession({
      ...base,
      paymentQrCodeId: "qr-1",
      qrContactPhone: "12",
      qrContactEmail: "not-an-email",
    });
    assert.equal(r.success, false);
  });

  it("accepts valid QR session", () => {
    const r = parseSession({
      ...base,
      paymentQrCodeId: "qr-uuid",
      qrContactPhone: "+91 9876543210",
      qrContactEmail: "pay@andweyoga.com",
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.paymentMethod, "qr");
      assert.equal(r.data.razorpayLink, null);
      assert.equal(r.data.paymentQrCodeId, "qr-uuid");
    }
  });
});

describe("adminCreateClassSessionSchema — recurrence", () => {
  const base = {
    classTypeId: "ct-1",
    instructorId: "ins-1",
    date: futureDate,
    maxCapacity: "10",
    googleMeetLink: "https://meet.google.com/abc-defg-hij",
    paymentMethod: "razorpay_link",
    razorpayLink: "https://rzp.io/i/x",
    publishMode: "now",
  };

  it("accepts one-time (default)", () => {
    const r = parseSession({ ...base });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.recurrenceKind, "once");
      assert.equal(r.data.occurrenceCount, 1);
    }
  });

  it("accepts weekly series with 4 weeks", () => {
    const r = parseSession({
      ...base,
      recurrenceKind: "weekly",
      occurrenceCount: "4",
      recurrenceWeekdays: [1],
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.recurrenceKind, "weekly");
      assert.equal(r.data.occurrenceCount, 4);
    }
  });

  it("rejects weekly with only 1 occurrence", () => {
    const r = parseSession({
      ...base,
      recurrenceKind: "weekly",
      occurrenceCount: "1",
    });
    assert.equal(r.success, false);
  });

  it("rejects weekly without weekdays selected", () => {
    const r = parseSession({
      ...base,
      recurrenceKind: "weekly",
      occurrenceCount: "4",
      recurrenceWeekdays: [],
    });
    assert.equal(r.success, false);
    if (!r.success) {
      assert.ok(r.error.issues.some((i) => i.path[0] === "recurrenceWeekdays"));
    }
  });

  it("accepts weekly with explicit weekdays", () => {
    const r = parseSession({
      ...base,
      recurrenceKind: "weekly",
      occurrenceCount: "2",
      recurrenceWeekdays: [1, 3],
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.deepEqual(r.data.recurrenceWeekdays, [1, 3]);
    }
  });
});

describe("adminCreateClassSessionSchema — publication", () => {
  it("requires publishAt when publish later", () => {
    const r = parseSession({
      classTypeId: "ct-1",
      instructorId: "ins-1",
      date: futureDate,
      maxCapacity: "10",
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/x",
      publishMode: "later",
      publishAt: "",
    });
    assert.equal(r.success, false);
    if (!r.success) assert.ok(r.error.issues.some((i) => i.path[0] === "publishAt"));
  });
});

describe("validateSessionForm (client helper)", async () => {
  const { validateSessionForm } = await import("../client/src/lib/admin-api.ts");

  it("returns field map for invalid QR form", () => {
    const r = validateSessionForm({
      classTypeId: "",
      instructorId: "",
      date: "",
      maxCapacity: "20",
      googleMeetLink: "",
      paymentMethod: "qr",
      razorpayLink: "",
      paymentQrCodeId: "",
      qrContactPhone: "bad",
      qrContactEmail: "x",
      publishMode: "now",
      publishAt: "",
      recurrenceKind: "once",
      occurrenceCount: "4",
      recurrenceWeekdays: [],
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.errors.classTypeId);
      assert.ok(r.errors.qrContactPhone || r.errors.qrContactEmail);
    }
  });
});
