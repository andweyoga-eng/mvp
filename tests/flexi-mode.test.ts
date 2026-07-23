import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFlexiCandidate,
  defaultFlexiTermsItems,
  flexiOptionsMatchFixedSlots,
  flexiTooltipCopy,
  formatFlexiTimeLabel,
  FLEXI_BOOKING_ENABLED,
  hasFlexiScheduleConfig,
  isFlexiEnabledSchedule,
  resolveFlexiSelectionCount,
  sharesFlexiPool,
} from "../shared/flexi-mode";
import { resolveSessionTermsItems } from "../shared/session-terms";

describe("flexi-mode helpers", () => {
  it("marks only weekly flexi schedules as configured", () => {
    assert.equal(
      hasFlexiScheduleConfig({
        id: "a",
        classTypeId: "ct",
        instructorId: "ins",
        date: new Date(),
        flexiEnabled: true,
        recurrenceKind: "weekly",
        seriesId: "series-1",
      }),
      true,
    );
    assert.equal(
      hasFlexiScheduleConfig({
        id: "b",
        classTypeId: "ct",
        instructorId: "ins",
        date: new Date(),
        flexiEnabled: true,
        recurrenceKind: "once",
        seriesId: "series-1",
      }),
      false,
    );
  });

  it("respects the site-wide Flexi kill switch for member eligibility", () => {
    const weeklyFlexi = {
      id: "a",
      classTypeId: "ct",
      instructorId: "ins",
      date: new Date(),
      flexiEnabled: true,
      recurrenceKind: "weekly" as const,
      seriesId: "series-1",
    };
    assert.equal(isFlexiEnabledSchedule(weeklyFlexi), FLEXI_BOOKING_ENABLED);
    if (!FLEXI_BOOKING_ENABLED) {
      assert.equal(isFlexiEnabledSchedule(weeklyFlexi), false);
    }
  });

  it("anchors selection count from explicit schedule value", () => {
    assert.equal(
      resolveFlexiSelectionCount({
        id: "a",
        classTypeId: "ct",
        instructorId: "ins",
        date: new Date(),
        recurrenceWeekdays: "1,2,3",
        flexiSelectionCount: 2,
      }),
      2,
    );
    assert.equal(
      resolveFlexiSelectionCount({
        id: "a",
        classTypeId: "ct",
        instructorId: "ins",
        date: new Date(),
        recurrenceWeekdays: "1,2,3",
      }),
      3,
    );
  });

  it("pools by class type and instructor only", () => {
    assert.equal(
      sharesFlexiPool(
        { classTypeId: "ct", instructorId: "ins" },
        { classTypeId: "ct", instructorId: "ins" },
      ),
      true,
    );
    assert.equal(
      sharesFlexiPool(
        { classTypeId: "ct", instructorId: "ins" },
        { classTypeId: "ct", instructorId: "other" },
      ),
      false,
    );
  });

  it("builds weekday/source candidates", () => {
    const candidate = buildFlexiCandidate(
      {
        id: "class-1",
        classTypeId: "ct",
        instructorId: "ins",
        date: "2026-07-08T12:30:00.000Z",
        seriesId: "series-a",
      },
      1,
    );
    assert.equal(candidate.weekday, 1);
    assert.equal(candidate.sourceSeriesId, "series-a");
    assert.equal(candidate.sourceClassId, "class-1");
    assert.ok(candidate.timeLabel.length > 0);
  });

  it("formats flexi time labels in IST regardless of server timezone", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      assert.equal(formatFlexiTimeLabel("2026-07-08T13:00:00.000Z"), "6:30 pm");
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });

  it("detects when flexi options match fixed slots", () => {
    assert.equal(
      flexiOptionsMatchFixedSlots(
        [1, 3],
        "6:30 PM",
        2,
        [
          { weekday: 1, timeLabel: "6:30 PM" },
          { weekday: 3, timeLabel: "6:30 PM" },
        ],
      ),
      true,
    );
    assert.equal(
      flexiOptionsMatchFixedSlots(
        [1, 3],
        "6:30 PM",
        2,
        [
          { weekday: 1, timeLabel: "6:30 PM" },
          { weekday: 3, timeLabel: "6:30 PM" },
          { weekday: 5, timeLabel: "6:30 PM" },
        ],
      ),
      false,
    );
    assert.equal(
      flexiOptionsMatchFixedSlots(
        [1, 3],
        "6:30 PM",
        2,
        [{ weekday: 1, timeLabel: "7:00 PM" }],
      ),
      false,
    );
    assert.equal(flexiOptionsMatchFixedSlots([1, 3], "6:30 PM", 2, []), true);
  });

  it("keeps compact terms with expandable extras", () => {
    const items = resolveSessionTermsItems(null, defaultFlexiTermsItems().slice(1));
    assert.ok(items.length >= 3);
    assert.equal(items[0]?.summary.includes("non-refundable"), true);
    assert.equal(items.some((item) => item.key === "flexi_final_checkout"), true);
    assert.equal(items.some((item) => item.key === "non_transferable"), true);
    assert.ok(flexiTooltipCopy().includes("Pick your weekly slots from any of the eligible schedule sets"));
  });
});
