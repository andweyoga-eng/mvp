import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isClassVisibleForBooking } from "../shared/class-visibility.ts";
import { collectBookableClassTypeIds } from "../client/src/lib/class-type-availability.ts";
import { filterBookableSessions } from "../client/src/lib/booking-flow.ts";

describe("class visibility catalog", () => {
  it("paused status hides session even without pausedAt timestamp", () => {
    assert.equal(
      isClassVisibleForBooking({
        status: "paused",
        publishedAt: new Date(),
        pausedAt: null,
        cancelledAt: null,
      }),
      false,
    );
  });

  it("cancelled status hides session", () => {
    assert.equal(
      isClassVisibleForBooking({
        status: "cancelled",
        publishedAt: new Date(),
        pausedAt: null,
        cancelledAt: null,
      }),
      false,
    );
  });

  it("pausedAt hides published session", () => {
    assert.equal(
      isClassVisibleForBooking({
        status: "published",
        publishedAt: new Date(),
        pausedAt: new Date(),
        cancelledAt: null,
      }),
      false,
    );
  });

  it("filterBookableSessions drops paused rows from stale client cache", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const filtered = filterBookableSessions([
      {
        date: future,
        currentBookings: 0,
        maxCapacity: 10,
        sessionFrequency: "recurring",
        status: "paused",
        pausedAt: new Date().toISOString(),
        cancelledAt: null,
      },
      {
        date: future,
        currentBookings: 0,
        maxCapacity: 10,
        sessionFrequency: "recurring",
        status: "published",
        pausedAt: null,
        cancelledAt: null,
      },
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.status, "published");
  });
});

describe("bookable class cards", () => {
  it("does not treat an ended published session as bookable", () => {
    const retreatId = "retreat";
    const ids = collectBookableClassTypeIds(
      [
        {
          classTypeId: retreatId,
          date: "2020-01-01T10:00:00.000Z",
          duration: 60,
          status: "published",
          publishedAt: "2020-01-01T00:00:00.000Z",
          pausedAt: null,
          cancelledAt: null,
        },
      ],
      [],
      new Date("2026-10-18T12:00:00.000Z"),
    );
    assert.equal(ids.has(retreatId), false);
  });

  it("keeps a class that still has an open session", () => {
    const ids = collectBookableClassTypeIds(
      [
        {
          classTypeId: "flow",
          date: "2026-10-18T18:00:00.000Z",
          duration: 60,
          status: "published",
          publishedAt: "2026-10-01T00:00:00.000Z",
          pausedAt: null,
          cancelledAt: null,
        },
      ],
      [],
      new Date("2026-10-18T12:00:00.000Z"),
    );
    assert.equal(ids.has("flow"), true);
  });
});

describe("public schedule route wiring", async () => {
  it("schedule week uses bookable classes by date", async () => {
    const { readFile } = await import("node:fs/promises");
    const routesSource = await readFile(new URL("../server/routes.ts", import.meta.url), "utf8");
    assert.match(routesSource, /getBookableClassesByDate/);
    assert.doesNotMatch(
      routesSource,
      /const dayClasses = await storage\.getClassesByDate\(currentDay\)/,
    );
  });
});
