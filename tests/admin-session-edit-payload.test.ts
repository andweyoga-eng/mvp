/**
 * Admin edit session — payload must preserve session type fields from API rows.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Mirrors week-schedule-grid toEditPayload (keep in sync). */
function toEditPayload(s: {
  id: string;
  classTypeId?: string;
  instructorId?: string;
  date: string;
  maxCapacity?: number;
  googleMeetLink?: string | null;
  deliveryMode?: string | null;
  sessionFrequency?: string | null;
  venueAddress?: string | null;
  venueMapLink?: string | null;
  venueContactPhone?: string | null;
  paymentMethod?: string | null;
  razorpayLink?: string | null;
  paymentQrCodeId?: string | null;
  qrContactPhone?: string | null;
  qrContactEmail?: string | null;
  status?: string;
  publishedAt?: string | null;
  recurrenceKind?: string | null;
  recurrenceWeekdays?: string | null;
  seriesId?: string | null;
  seriesWeekCount?: number | null;
  flexiEnabled?: boolean | null;
}) {
  return {
    id: s.id,
    classTypeId: s.classTypeId!,
    instructorId: s.instructorId!,
    date: s.date,
    maxCapacity: s.maxCapacity ?? 20,
    googleMeetLink: s.googleMeetLink,
    deliveryMode: s.deliveryMode,
    sessionFrequency: s.sessionFrequency,
    venueAddress: s.venueAddress,
    venueMapLink: s.venueMapLink,
    venueContactPhone: s.venueContactPhone,
    paymentMethod: s.paymentMethod,
    razorpayLink: s.razorpayLink,
    paymentQrCodeId: s.paymentQrCodeId,
    qrContactPhone: s.qrContactPhone,
    qrContactEmail: s.qrContactEmail,
    status: s.status,
    publishedAt: s.publishedAt,
    recurrenceKind: s.recurrenceKind,
    seriesId: s.seriesId,
    seriesWeekCount: s.seriesWeekCount,
    flexiEnabled: !!s.flexiEnabled,
  };
}

describe("admin session edit payload", () => {
  it("preserves drop_in session frequency and delivery mode for edit modal", () => {
    const payload = toEditPayload({
      id: "sess-1",
      classTypeId: "type-1",
      instructorId: "inst-1",
      date: "2026-06-01T10:00:00.000Z",
      sessionFrequency: "drop_in",
      deliveryMode: "online",
      venueAddress: "Studio A",
    });
    assert.equal(payload.sessionFrequency, "drop_in");
    assert.equal(payload.deliveryMode, "online");
    assert.equal(payload.venueAddress, "Studio A");
  });
});
