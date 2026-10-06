import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  composeIsoDate,
  parseIsoDateParts,
} from "../client/src/components/date-of-birth-field.tsx";

/** Simulates incremental DOB picks with local part state (fixed field behavior). */
function pickDob(
  parts: { day: string; month: string; year: string },
  part: "day" | "month" | "year",
  next: string,
): string {
  const nextParts = { ...parts, [part]: next };
  return composeIsoDate(nextParts.day, nextParts.month, nextParts.year);
}

describe("date-of-birth-field helpers", () => {
  it("parses and composes ISO dates", () => {
    assert.deepEqual(parseIsoDateParts("1990-06-15"), {
      year: "1990",
      month: "06",
      day: "15",
    });
    assert.equal(composeIsoDate("15", "06", "1990"), "1990-06-15");
    assert.equal(composeIsoDate("15", "06", ""), "");
  });

  it("accumulates partial picks in any order", () => {
    let parts = { day: "", month: "", year: "" };
    parts = { day: "15", month: parts.month, year: parts.year };
    assert.equal(pickDob(parts, "day", "15"), "");
    parts.day = "15";

    parts = { ...parts, month: "06" };
    assert.equal(pickDob(parts, "month", "06"), "");
    parts.month = "06";

    parts = { ...parts, year: "1990" };
    assert.equal(pickDob(parts, "year", "1990"), "1990-06-15");
  });
});
