import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatRecurringScheduleLine,
  formatRecurringWeekdayList,
  isFixedRecurringCheckout,
} from "../client/src/lib/recurring-series-display.ts";

describe("recurring series display", () => {
  it("isFixedRecurringCheckout for weekly series with weekdays", () => {
    assert.equal(
      isFixedRecurringCheckout({
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: "series-1",
        recurrenceWeekdays: "1,3",
      }),
      true,
    );
  });

  it("isFixedRecurringCheckout false for drop-in", () => {
    assert.equal(
      isFixedRecurringCheckout({
        sessionFrequency: "drop_in",
        recurrenceKind: "weekly",
        seriesId: "series-1",
        recurrenceWeekdays: "1,3",
      }),
      false,
    );
  });

  it("isFixedRecurringCheckout false without seriesId", () => {
    assert.equal(
      isFixedRecurringCheckout({
        sessionFrequency: "recurring",
        recurrenceKind: "weekly",
        seriesId: null,
        recurrenceWeekdays: "1,3",
      }),
      false,
    );
  });

  it("formatRecurringWeekdayList joins days naturally", () => {
    assert.equal(formatRecurringWeekdayList([1]), "Mon");
    assert.equal(formatRecurringWeekdayList([1, 3]), "Mon & Wed");
    assert.equal(formatRecurringWeekdayList([1, 3, 5]), "Mon, Wed & Fri");
  });

  it("formatRecurringScheduleLine includes days and time", () => {
    const line = formatRecurringScheduleLine(
      {
        recurrenceWeekdays: "1,3",
        date: "2026-07-07T06:30:00.000Z",
      },
      "2026-07-07T06:30:00.000Z",
    );
    assert.match(line, /^Every Mon & Wed · /);
  });
});
