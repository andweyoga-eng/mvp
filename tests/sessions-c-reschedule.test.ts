import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRescheduleWindow, sortRescheduleTargets } from "../shared/reschedule";

describe("Part C FR-50 — reschedule window and sort", () => {
  it("window starts at max(now, horizonStart) and ends at deadline", () => {
    const cancelAt = new Date("2026-08-03T00:00:00.000Z");
    const now = new Date("2026-08-05T00:00:00.000Z");
    const horizonStart = new Date("2026-08-01T00:00:00.000Z");
    const horizonEnd = new Date("2026-08-20T00:00:00.000Z");
    const w = computeRescheduleWindow({ cancelAt, horizonStartAt: horizonStart, horizonEndAt: horizonEnd, now });
    assert.equal(w.windowStart.toISOString(), now.toISOString());
    assert.equal(w.open, true);
    // cancel+30d = Sep 2 > Aug 20 horizon → deadline Sep 2
    assert.equal(w.windowEnd.toISOString(), "2026-09-02T00:00:00.000Z");
  });

  it("sorts preferred instructor first then by date", () => {
    const sorted = sortRescheduleTargets(
      [
        { instructorId: "b", date: "2026-08-10T10:00:00.000Z" },
        { instructorId: "a", date: "2026-08-12T10:00:00.000Z" },
        { instructorId: "a", date: "2026-08-11T10:00:00.000Z" },
      ],
      "a",
    );
    assert.deepEqual(
      sorted.map((r) => `${r.instructorId}:${r.date.slice(0, 10)}`),
      ["a:2026-08-11", "a:2026-08-12", "b:2026-08-10"],
    );
  });
});
