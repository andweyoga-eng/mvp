import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatScheduleDayHeader,
  getRollingWeekDateRange,
  getSessionEndMs,
} from "../shared/schedule-display.ts";

describe("schedule display helpers", () => {
  it("formats a single day header line", () => {
    const label = formatScheduleDayHeader("2026-05-29T10:00:00.000Z");
    assert.match(label, /·/);
    assert.doesNotMatch(label, /\d{4}/);
  });

  it("builds rolling week label with range", () => {
    const w = getRollingWeekDateRange(new Date("2026-05-19T12:00:00.000Z"));
    assert.ok(w.weekNumber >= 1);
    // Plain "to" separator — no en/em dashes in member-facing copy.
    assert.match(w.label, /\bto\b/);
  });

  it("computes session end from duration", () => {
    const end = getSessionEndMs("2026-05-19T11:00:00.000Z", 45);
    assert.equal(end, new Date("2026-05-19T11:45:00.000Z").getTime());
  });
});
