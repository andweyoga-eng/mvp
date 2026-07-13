import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareFlexiFlexibility,
  emptyFlexiEligibilitySummary,
  isFlexiEligibleSchedule,
  summarizeFlexiOptions,
  FLEXI_ELIGIBILITY_BATCH_MAX,
} from "../shared/flexi-discovery";

describe("flexi-discovery helpers", () => {
  it("derives client-side eligibility from schedule shape", () => {
    assert.equal(
      isFlexiEligibleSchedule({
        id: "a",
        classTypeId: "ct",
        instructorId: "in",
        date: "2026-07-13T06:30:00.000Z",
        recurrenceKind: "weekly",
        seriesId: "s1",
        flexiEnabled: true,
      }),
      true,
    );
    assert.equal(
      isFlexiEligibleSchedule({
        id: "a",
        classTypeId: "ct",
        instructorId: "in",
        date: "2026-07-13T06:30:00.000Z",
        recurrenceKind: "weekly",
        seriesId: "s1",
        flexiEnabled: false,
      }),
      false,
    );
    assert.equal(isFlexiEligibleSchedule(null), false);
  });

  it("summarizes real swaps as meaningful and available", () => {
    const summary = summarizeFlexiOptions({
      anchorClassId: "anchor",
      selectionCount: 2,
      options: [
        { weekday: 1, timeLabel: "6:30 AM", capacityAvailable: true },
        { weekday: 3, timeLabel: "6:30 AM", capacityAvailable: true },
        { weekday: 5, timeLabel: "7:30 AM", capacityAvailable: false },
      ],
      fixedWeekdays: [1, 3],
      fixedTimeLabel: "6:30 AM",
    });
    assert.equal(summary.eligible, true);
    assert.equal(summary.hasMeaningfulSwaps, true);
    assert.equal(summary.optionCount, 3);
    assert.equal(summary.availableOptionCount, 2);
    assert.equal(summary.flexibilityScore, 2);
  });

  it("treats options identical to fixed slots as no meaningful swap", () => {
    const summary = summarizeFlexiOptions({
      anchorClassId: "anchor",
      selectionCount: 2,
      options: [
        { weekday: 1, timeLabel: "6:30 PM", capacityAvailable: true },
        { weekday: 3, timeLabel: "6:30 PM", capacityAvailable: true },
      ],
      fixedWeekdays: [1, 3],
      fixedTimeLabel: "6:30 PM",
    });
    assert.equal(summary.hasMeaningfulSwaps, false);
    assert.equal(summary.flexibilityScore, 0);
  });

  it("empty summary marks ineligible with zero score", () => {
    const summary = emptyFlexiEligibilitySummary("anchor");
    assert.equal(summary.eligible, false);
    assert.equal(summary.hasMeaningfulSwaps, false);
    assert.equal(summary.optionCount, 0);
    assert.equal(summary.flexibilityScore, 0);
  });

  it("sorts most flexible first, then by option count", () => {
    const a = summarizeFlexiOptions({
      anchorClassId: "a",
      selectionCount: 1,
      options: [
        { weekday: 1, timeLabel: "6:30 AM", capacityAvailable: true },
        { weekday: 2, timeLabel: "6:30 AM", capacityAvailable: true },
      ],
      fixedWeekdays: [1],
      fixedTimeLabel: "6:30 AM",
    });
    const b = summarizeFlexiOptions({
      anchorClassId: "b",
      selectionCount: 1,
      options: [{ weekday: 4, timeLabel: "6:30 AM", capacityAvailable: true }],
      fixedWeekdays: [1],
      fixedTimeLabel: "6:30 AM",
    });
    const sorted = [b, a].sort(compareFlexiFlexibility);
    assert.deepEqual(
      sorted.map((s) => s.anchorClassId),
      ["a", "b"],
    );
  });

  it("keeps a bounded batch cap for future search", () => {
    assert.ok(FLEXI_ELIGIBILITY_BATCH_MAX > 0);
    assert.ok(FLEXI_ELIGIBILITY_BATCH_MAX <= 100);
  });
});
