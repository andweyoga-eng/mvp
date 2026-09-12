import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expandSessionOccurrences,
  MAX_WEEKLY_OCCURRENCES,
  parseRecurrenceWeekdays,
  serializeRecurrenceWeekdays,
} from "../shared/session-schedule.ts";
import { getIstWallParts } from "../shared/ist-datetime.ts";

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
    assert.equal(getIstWallParts(dates[1]!).day, 8);
    assert.equal(getIstWallParts(dates[3]!).day, 22);
    assert.equal(getIstWallParts(dates[0]!).hour, 10);
  });

  it("expands weekly on selected weekdays in IST", () => {
    const start = new Date("2026-06-03T10:00:00+05:30"); // Wed
    const dates = expandSessionOccurrences({
      startAt: start,
      recurrenceKind: "weekly",
      occurrenceCount: 2,
      recurrenceWeekdays: [1, 3], // Mon + Wed
    });
    assert.equal(dates.length, 4);
    assert.equal(getIstWallParts(dates[0]!).weekday, 3);
    assert.equal(getIstWallParts(dates[1]!).weekday, 1);
    assert.equal(getIstWallParts(dates[2]!).weekday, 3);
    assert.equal(getIstWallParts(dates[3]!).weekday, 1);
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

  it("keeps 7:30 AM IST across Mon/Wed/Fri expansion under TZ=UTC", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const start = new Date("2026-07-17T02:00:00.000Z"); // Fri 7:30 AM IST
      const dates = expandSessionOccurrences({
        startAt: start,
        recurrenceKind: "weekly",
        occurrenceCount: 2,
        recurrenceWeekdays: [1, 3, 5],
      });
      assert.ok(dates.length >= 3);
      for (const d of dates) {
        const p = getIstWallParts(d);
        assert.equal(p.hour, 7);
        assert.equal(p.minute, 30);
      }
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });
});
