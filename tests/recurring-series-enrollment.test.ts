import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countCompletedAmongEnrollment,
  countSeriesSessionsFromAnchor,
  filterSeriesClassesFromAnchor,
  recurringEnrollmentMappingStatus,
} from "../shared/recurring-series-enrollment.ts";

const SERIES = [
  { id: "c1", date: "2026-07-07T20:30:00.000Z", status: "published" },
  { id: "c2", date: "2026-07-09T20:30:00.000Z", status: "published" },
  { id: "c3", date: "2026-07-12T20:30:00.000Z", status: "published" },
  { id: "c4", date: "2026-07-14T20:30:00.000Z", status: "published" },
  { id: "c5", date: "2026-07-16T20:30:00.000Z", status: "published" },
  { id: "c6", date: "2026-07-19T20:30:00.000Z", status: "published", cancelledAt: "2026-07-18T00:00:00.000Z" },
  { id: "c7", date: "2026-07-21T20:30:00.000Z", status: "paused", pausedAt: "2026-07-20T00:00:00.000Z" },
  { id: "c8", date: "2026-07-23T20:30:00.000Z", status: "published" },
];

describe("recurring series enrollment helpers", () => {
  it("counts package size from anchor date onward and skips cancelled/paused", () => {
    const from = filterSeriesClassesFromAnchor(SERIES, "2026-07-12T20:30:00.000Z");
    assert.deepEqual(
      from.map((c) => c.id),
      ["c3", "c4", "c5", "c8"],
    );
    assert.equal(countSeriesSessionsFromAnchor(SERIES, "2026-07-12T20:30:00.000Z"), 4);
  });

  it("marks ended sessions completed and future ones upcoming", () => {
    const now = new Date("2026-07-15T02:30:00.000Z");
    assert.equal(
      recurringEnrollmentMappingStatus("2026-07-14T20:30:00.000Z", 60, now),
      "completed",
    );
    assert.equal(
      recurringEnrollmentMappingStatus("2026-07-16T20:30:00.000Z", 60, now),
      "upcoming",
    );
  });

  it("counts completed seats among an enrolled package", () => {
    const now = new Date("2026-07-15T02:30:00.000Z");
    const packageClasses = filterSeriesClassesFromAnchor(SERIES, "2026-07-12T20:30:00.000Z");
    assert.equal(countCompletedAmongEnrollment(packageClasses, 60, now), 2);
  });
});
