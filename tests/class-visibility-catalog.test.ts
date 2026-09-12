import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isClassVisibleForBooking } from "../shared/class-visibility.ts";
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
