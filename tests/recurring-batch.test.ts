import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isRecurringBatchInProgress,
  shouldBlockRecurringMidBatchBooking,
} from "../shared/recurring-batch.ts";

const SERIES = {
  startAt: new Date("2026-06-01T10:00:00.000Z"),
  endAt: new Date("2026-06-22T10:00:00.000Z"),
};

describe("recurring mid-batch booking", () => {
  it("allows booking a future session while batch is in progress", () => {
    const now = new Date("2026-06-08T12:00:00.000Z");
    assert.equal(isRecurringBatchInProgress(SERIES, 60, now), true);
    assert.equal(
      shouldBlockRecurringMidBatchBooking({
        sessionStart: "2026-06-15T10:00:00.000Z",
        sessionFrequency: "recurring",
        seriesId: "series-1",
        seriesBounds: SERIES,
        durationMinutes: 60,
        now,
      }),
      false,
    );
  });

  it("blocks booking a session that has already started", () => {
    const now = new Date("2026-06-08T12:00:00.000Z");
    assert.equal(
      shouldBlockRecurringMidBatchBooking({
        sessionStart: "2026-06-01T10:00:00.000Z",
        sessionFrequency: "recurring",
        seriesId: "series-1",
        seriesBounds: SERIES,
        durationMinutes: 60,
        now,
      }),
      true,
    );
  });

  it("allows booking before the batch first session", () => {
    const now = new Date("2026-05-28T12:00:00.000Z");
    assert.equal(
      shouldBlockRecurringMidBatchBooking({
        sessionStart: "2026-06-01T10:00:00.000Z",
        sessionFrequency: "recurring",
        seriesId: "series-1",
        seriesBounds: SERIES,
        durationMinutes: 60,
        now,
      }),
      false,
    );
  });
});
