import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expandSessionOccurrences,
  MAX_WEEKLY_OCCURRENCES,
  parseRecurrenceWeekdays,
  serializeRecurrenceWeekdays,
} from "../shared/session-schedule.ts";

describe("recurrence weekday serialization", () => {
  it("round-trips weekday lists", () => {
    assert.equal(serializeRecurrenceWeekdays([3, 1, 1]), "1,3");
    assert.deepEqual(parseRecurrenceWeekdays("1,3,5"), [1, 3, 5]);
  });
});

describe("expandSessionOccurrences", () => {
  it("returns one date for once", () => {
    const start = new Date("2026-06-01T10:00:00+05:30");
    const dates = expandSessionOccurrences({
      startAt: start,
      recurrenceKind: "once",
      occurrenceCount: 1,
    });
    assert.equal(dates.length, 1);
    assert.equal(dates[0].getTime(), start.getTime());
  });

  it("expands weekly series on same weekday (legacy)", () => {
    const start = new Date("2026-06-01T10:00:00+05:30");
    const dates = expandSessionOccurrences({
      startAt: start,
      recurrenceKind: "weekly",
      occurrenceCount: 4,
    });
    assert.equal(dates.length, 4);
    assert.equal(dates[1].getDate(), 8);
    assert.equal(dates[3].getDate(), 22);
  });

  it("expands weekly on selected weekdays", () => {
    const start = new Date("2026-06-03T10:00:00+05:30"); // Wed
    const dates = expandSessionOccurrences({
      startAt: start,
      recurrenceKind: "weekly",
      occurrenceCount: 2,
      recurrenceWeekdays: [1, 3], // Mon + Wed
    });
    assert.equal(dates.length, 4);
    assert.equal(dates[0].getDay(), 3);
    assert.equal(dates[1].getDay(), 1);
    assert.equal(dates[2].getDay(), 3);
    assert.equal(dates[3].getDay(), 1);
  });

  it("caps weekly at MAX_WEEKLY_OCCURRENCES", () => {
    const start = new Date("2026-06-01T10:00:00+05:30");
    const dates = expandSessionOccurrences({
      startAt: start,
      recurrenceKind: "weekly",
      occurrenceCount: 99,
    });
    assert.equal(dates.length, MAX_WEEKLY_OCCURRENCES);
  });
});
