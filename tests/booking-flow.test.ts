/**
 * Booking flow unit tests — all entry points + API body validation.
 * Run: npm test
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  memberBookingBodySchema,
  createBookingRequestSchema,
  insertBookingSchema,
} from "../shared/schema.ts";
import {
  isSessionUpcoming,
  filterBookableSessions,
  filterUpcomingScheduleDays,
  normalizeBookingIntent,
} from "../client/src/lib/booking-flow.ts";
import {
  setPendingBooking,
  getPendingBooking,
  clearPendingBooking,
} from "../client/src/lib/pending-booking.ts";

// --- sessionStorage mock for pending-booking tests ---
function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (_i: number) => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const NOW = new Date("2026-05-19T12:00:00.000Z");

function session(
  id: string,
  date: string,
  currentBookings = 0,
  maxCapacity = 10,
  classTypeId = "type-hatha",
  duration = 60,
  sessionFrequency: string | null = "recurring",
) {
  return {
    id,
    date,
    currentBookings,
    maxCapacity,
    classTypeId,
    sessionFrequency,
    classType: { id: classTypeId, name: "Hatha", duration },
  };
}

function filterForClassType(
  all: ReturnType<typeof session>[],
  classTypeId: string,
) {
  return filterBookableSessions(all, NOW).filter(
    (cls) => cls.classType?.id === classTypeId || cls.classTypeId === classTypeId,
  );
}

/** Payload the booking modal sends to POST /api/bookings */
function buildBookingRequestBody(classId: string) {
  return { classId };
}

describe("memberBookingBodySchema (POST /api/bookings)", () => {
  it("accepts { classId } only — member booking fix", () => {
    const result = memberBookingBodySchema.safeParse({ classId: "sess-uuid-1" });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.classId, "sess-uuid-1");
  });

  it("rejects empty body", () => {
    const result = memberBookingBodySchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("rejects missing classId", () => {
    const result = memberBookingBodySchema.safeParse({ userId: "user-1" });
    assert.equal(result.success, false);
  });

  it("createBookingRequestSchema accepts member body without guestPhone", () => {
    const result = createBookingRequestSchema.safeParse({ classId: "sess-uuid-1" });
    assert.equal(result.success, true);
  });

  it("createBookingRequestSchema accepts guest body with phone", () => {
    const result = createBookingRequestSchema.safeParse({
      classId: "sess-1",
      guestName: "Guest",
      guestEmail: "guest@example.com",
      guestPhone: "9876543210",
    });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.guestPhone, "9876543210");
  });

  it("insertBookingSchema accepts guest checkout without userId", () => {
    const result = insertBookingSchema.safeParse({
      classId: "sess-1",
      isGuestCheckout: true,
      guestName: "Guest User",
      guestEmail: "guest@example.com",
    });
    assert.equal(result.success, true);
  });

  it("old insertBookingSchema accepts classId + userId", () => {
    const result = insertBookingSchema.safeParse({
      classId: "sess-1",
      userId: "user-1",
    });
    assert.equal(result.success, true);
  });
});

describe("isSessionUpcoming & filterBookableSessions (dropdown)", () => {
  it("excludes ended sessions but keeps in-progress sessions", () => {
    assert.equal(isSessionUpcoming("2026-05-20T12:00:00.000Z", NOW), true);
    assert.equal(
      isSessionUpcoming("2026-05-19T11:14:00.000Z", new Date("2026-05-19T11:17:00.000Z"), 60),
      true,
    );
    assert.equal(isSessionUpcoming("2026-05-19T10:30:00.000Z", NOW, 60), false);
    assert.equal(isSessionUpcoming("2026-05-18T12:00:00.000Z", NOW), false);
  });

  it("dropdown list has open sessions with capacity", () => {
    const all = [
      session("past", "2026-05-18T10:00:00.000Z"),
      session("in-progress", "2026-05-19T11:30:00.000Z"),
      session("now-edge", "2026-05-19T12:00:00.000Z"),
      session("future1", "2026-05-20T10:00:00.000Z"),
      session("future2", "2026-05-21T10:00:00.000Z"),
      session("full", "2026-05-22T10:00:00.000Z", 10, 10),
    ];
    const bookable = filterBookableSessions(all, NOW);
    assert.deepEqual(
      bookable.map((c) => c.id),
      ["in-progress", "now-edge", "future1", "future2"],
    );
  });

  it("blocks trial/drop-in after start but keeps recurring in-progress bookable", () => {
    const all = [
      session("trial-live", "2026-05-19T11:30:00.000Z", 0, 10, "type-hatha", 60, "trial"),
      session("dropin-live", "2026-05-19T11:45:00.000Z", 0, 10, "type-hatha", 60, "drop_in"),
      session("recurring-live", "2026-05-19T11:30:00.000Z", 0, 10, "type-hatha", 60, "recurring"),
    ];
    const bookable = filterBookableSessions(all, NOW);
    assert.deepEqual(bookable.map((c) => c.id), ["recurring-live"]);
  });
});

describe("filterUpcomingScheduleDays (week schedule)", () => {
  it("removes past sessions and empty days", () => {
    const days = [
      {
        day: "Monday",
        date: "2026-05-18T00:00:00.000Z",
        classes: [
          session("past", "2026-05-18T10:00:00.000Z"),
          session("future", "2026-05-20T10:00:00.000Z"),
        ],
      },
      {
        day: "Tuesday",
        date: "2026-05-19T00:00:00.000Z",
        classes: [session("ended", "2026-05-19T10:00:00.000Z", 0, 10, "type-hatha", 30)],
      },
      {
        day: "Wednesday",
        date: "2026-05-20T00:00:00.000Z",
        classes: [session("upcoming", "2026-05-21T10:00:00.000Z")],
      },
    ];
    const filtered = filterUpcomingScheduleDays(days, NOW);
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered[0].classes.map((c) => c.id), ["future"]);
    assert.deepEqual(filtered[1].classes.map((c) => c.id), ["upcoming"]);
  });
});

describe("normalizeBookingIntent — every Book entry point", () => {
  it("Week Schedule → Book passes session id string", () => {
    assert.deepEqual(normalizeBookingIntent("session-from-schedule"), {
      sessionId: "session-from-schedule",
      scrollTo: "schedule",
    });
  });

  it("and We Workout → Book Now passes classTypeId", () => {
    assert.deepEqual(
      normalizeBookingIntent({ classTypeId: "type-hatha", scrollTo: "teach" }),
      { sessionId: undefined, classTypeId: "type-hatha", scrollTo: "teach" },
    );
  });

  it("Nav / Hero → Book Session opens browse (schedule scroll)", () => {
    assert.deepEqual(normalizeBookingIntent({ scrollTo: "schedule" }), {
      sessionId: undefined,
      classTypeId: undefined,
      scrollTo: "schedule",
    });
  });

  it("My Account redirect uses openBooking browse intent", () => {
    assert.deepEqual(normalizeBookingIntent(undefined), { scrollTo: "schedule" });
  });

  it("classTypeId without scrollTo defaults scrollTo to teach", () => {
    assert.deepEqual(normalizeBookingIntent({ classTypeId: "type-1" }), {
      sessionId: undefined,
      classTypeId: "type-1",
      scrollTo: "teach",
    });
  });
});

describe("and We Workout — class type filter on dropdown options", () => {
  it("only shows upcoming sessions for selected class type", () => {
    const all = [
      session("h1", "2026-05-20T10:00:00.000Z", 0, 10, "type-hatha"),
      session("m1", "2026-05-20T11:00:00.000Z", 0, 10, "type-meditation"),
      session("h-past", "2026-05-17T10:00:00.000Z", 0, 10, "type-hatha"),
    ];
    const hathaOnly = filterForClassType(all, "type-hatha");
    assert.deepEqual(hathaOnly.map((c) => c.id), ["h1"]);
  });
});

describe("booking modal request body", () => {
  it("sends only classId (matches memberBookingBodySchema)", () => {
    const body = buildBookingRequestBody("selected-session-id");
    const parsed = memberBookingBodySchema.safeParse(body);
    assert.equal(parsed.success, true);
    assert.deepEqual(body, { classId: "selected-session-id" });
  });
});

describe("readResponseJson (no double body read)", () => {
  it("parses success body only once", async () => {
    const { readResponseJson } = await import("../client/src/lib/queryClient.ts");
    const payload = { id: "booking-1", classId: "sess-1" };
    const res = new Response(JSON.stringify(payload), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
    const data = await readResponseJson<typeof payload>(res);
    assert.deepEqual(data, payload);
    await assert.rejects(() => res.json(), /already been read|already been consumed|body stream/i);
  });
});

describe("pending booking (login redirect restore)", () => {
  beforeEach(() => {
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage =
      createSessionStorageMock();
    clearPendingBooking();
  });

  it("persists schedule session across redirect", () => {
    setPendingBooking({ sessionId: "sess-99", scrollTo: "schedule" });
    assert.deepEqual(getPendingBooking(), {
      sessionId: "sess-99",
      scrollTo: "schedule",
    });
  });

  it("persists and We Workout class type across redirect", () => {
    setPendingBooking({ classTypeId: "type-hatha", scrollTo: "teach" });
    assert.deepEqual(getPendingBooking(), {
      classTypeId: "type-hatha",
      scrollTo: "teach",
    });
  });

  it("persists nav/hero browse intent (scrollTo only)", () => {
    setPendingBooking({ scrollTo: "schedule" });
    assert.deepEqual(getPendingBooking(), { scrollTo: "schedule" });
  });

  it("clears on close", () => {
    setPendingBooking({ sessionId: "x", scrollTo: "schedule" });
    clearPendingBooking();
    assert.equal(getPendingBooking(), null);
  });

  it("legacy session id key still restores schedule booking", () => {
    sessionStorage.setItem("awy_pending_booking_class_id", "legacy-sess");
    assert.deepEqual(getPendingBooking(), {
      sessionId: "legacy-sess",
      scrollTo: "schedule",
    });
  });
});

describe("entry point checklist (manual QA map)", () => {
  it("documents testids for your manual pass", () => {
    const entryPoints = [
      { source: "Nav desktop", testId: "nav-book-session" },
      { source: "Schedule row", testId: "book-class-<sessionId>" },
      { source: "and We Workout card", testId: "book-button-<classTypeId>" },
      { source: "Booking modal confirm", testId: "booking-confirm" },
      { source: "Booking modal pay", testId: "booking-pay-razorpay" },
      { source: "Booking modal dropdown", testId: "booking-class-select" },
    ];
    assert.equal(entryPoints.length, 6);
  });
});
