import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dateFromIstWall,
  formatIstDatetimeLocal,
  formatIstTime,
  getIstWallParts,
  parseIstDatetimeLocal,
  parsePgTimestampAsUtc,
} from "../shared/ist-datetime.ts";

describe("ist-datetime", () => {
  it("parses admin IST datetime-local into the correct UTC instant", () => {
    // 7:30 AM IST = 02:00 UTC
    const d = parseIstDatetimeLocal("2026-07-17T07:30");
    assert.equal(d.toISOString(), "2026-07-17T02:00:00.000Z");
    assert.equal(formatIstTime(d), "7:30 am");
  });

  it("round-trips IST wall clock through formatIstDatetimeLocal", () => {
    const d = parseIstDatetimeLocal("2026-07-17T07:30");
    assert.equal(formatIstDatetimeLocal(d), "2026-07-17T07:30");
  });

  it("treats naive Postgres timestamps as UTC (fixes 2:00 AM display bug)", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "Asia/Kolkata";
    try {
      const d = parsePgTimestampAsUtc("2026-07-17 02:00:00");
      assert.ok(d);
      assert.equal(d!.toISOString(), "2026-07-17T02:00:00.000Z");
      assert.equal(formatIstTime(d!), "7:30 am");
      const parts = getIstWallParts(d!);
      assert.equal(parts.hour, 7);
      assert.equal(parts.minute, 30);
      assert.equal(parts.weekday, 5); // Friday
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });

  it("builds IST wall dates without depending on process timezone", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const d = dateFromIstWall({
        year: 2026,
        month: 6,
        day: 17,
        hour: 7,
        minute: 30,
        second: 0,
        ms: 0,
      });
      assert.equal(d.toISOString(), "2026-07-17T02:00:00.000Z");
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });
});
