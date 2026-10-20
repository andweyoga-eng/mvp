import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collapseBookableForCarousel,
  formatHubCarouselSchedule,
} from "../client/src/lib/hub-carousel-sessions.ts";

const NOW = new Date("2026-07-06T06:00:00.000Z");

function makeSession(
  overrides: Partial<{
    id: string;
    date: string;
    sessionFrequency: string;
    recurrenceKind: string;
    seriesId: string | null;
    recurrenceWeekdays: string | null;
    currentBookings: number;
    maxCapacity: number;
    status: string | null;
    pausedAt: string | null;
    cancelledAt: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "session-1",
    date: overrides.date ?? "2026-07-10T10:30:00.000Z",
    currentBookings: overrides.currentBookings ?? 0,
    maxCapacity: overrides.maxCapacity ?? 20,
    sessionFrequency: overrides.sessionFrequency ?? "drop_in",
    recurrenceKind: overrides.recurrenceKind ?? "once",
    seriesId: overrides.seriesId ?? null,
    recurrenceWeekdays: overrides.recurrenceWeekdays ?? null,
    classType: { duration: 60 },
    status: overrides.status ?? "published",
    publishedAt: "2026-01-01T00:00:00.000Z",
    pausedAt: overrides.pausedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
  };
}

describe("formatHubCarouselSchedule", () => {
  it("shows weekdays and time for fixed recurring series", () => {
    const result = formatHubCarouselSchedule({
      sessionFrequency: "recurring",
      recurrenceKind: "weekly",
      seriesId: "series-1",
      recurrenceWeekdays: "1,3",
      date: "2026-07-07T13:00:00.000Z",
    });
    assert.equal(result.isRecurringSeries, true);
    assert.match(result.label, /Mon & Wed/);
    assert.match(result.label, /·/);
  });

  it("shows short day, date, and time for drop-in sessions", () => {
    const result = formatHubCarouselSchedule({
      sessionFrequency: "drop_in",
      recurrenceKind: "once",
      date: "2026-07-10T10:30:00.000Z",
    });
    assert.equal(result.isRecurringSeries, false);
    assert.match(result.label, /Fri, Jul 10/);
    assert.match(result.label, /·/);
  });

  it("shows short day, date, and time for trial sessions", () => {
    const result = formatHubCarouselSchedule({
      sessionFrequency: "trial",
      recurrenceKind: "once",
      date: "2026-07-12T04:00:00.000Z",
    });
    assert.equal(result.isRecurringSeries, false);
    assert.match(result.label, /Jul 12/);
  });
});

describe("collapseBookableForCarousel", () => {
  it("collapses multiple occurrences of the same recurring series to one card", () => {
    const sessions = [
      makeSession({
        id: "occ-1",
        date: "2026-07-07T13:00:00.000Z",
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: "series-a",
        recurrenceWeekdays: "1,3",
      }),
      makeSession({
        id: "occ-2",
        date: "2026-07-09T13:00:00.000Z",
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: "series-a",
        recurrenceWeekdays: "1,3",
      }),
      makeSession({
        id: "occ-3",
        date: "2026-07-14T13:00:00.000Z",
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: "series-a",
        recurrenceWeekdays: "1,3",
      }),
    ];

    const collapsed = collapseBookableForCarousel(sessions, 12, NOW);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0]?.id, "occ-1");
  });

  it("keeps separate cards for different series and one-offs", () => {
    const sessions = [
      makeSession({
        id: "series-a-1",
        date: "2026-07-07T13:00:00.000Z",
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: "series-a",
        recurrenceWeekdays: "1",
      }),
      makeSession({
        id: "series-b-1",
        date: "2026-07-08T13:00:00.000Z",
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: "series-b",
        recurrenceWeekdays: "2",
      }),
      makeSession({
        id: "drop-in-1",
        date: "2026-07-09T13:00:00.000Z",
        sessionFrequency: "drop_in",
      }),
    ];

    const collapsed = collapseBookableForCarousel(sessions, 12, NOW);
    assert.equal(collapsed.length, 3);
    assert.deepEqual(
      collapsed.map((s) => s.id),
      ["series-a-1", "series-b-1", "drop-in-1"],
    );
  });

  it("respects the carousel limit after collapse", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession({
        id: `drop-${i}`,
        date: new Date(NOW.getTime() + (i + 1) * 86_400_000).toISOString(),
        sessionFrequency: "drop_in",
      }),
    );

    const collapsed = collapseBookableForCarousel(sessions, 3, NOW);
    assert.equal(collapsed.length, 3);
  });
});
