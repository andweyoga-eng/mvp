import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatStrictNoToSummary,
  parseStrictNoToTags,
} from "../client/src/lib/strict-no-to.ts";

describe("parseStrictNoToTags", () => {
  it("splits comma-separated contraindications", () => {
    assert.deepEqual(parseStrictNoToTags("Pregnancy, High BP , Knee injury"), [
      "Pregnancy",
      "High BP",
      "Knee injury",
    ]);
  });

  it("returns empty array for blank values", () => {
    assert.deepEqual(parseStrictNoToTags(null), []);
    assert.deepEqual(parseStrictNoToTags("   "), []);
  });
});

describe("formatStrictNoToSummary", () => {
  it("shows None when there are no tags", () => {
    assert.equal(formatStrictNoToSummary(0), "None");
  });

  it("shows singular and plural listed counts", () => {
    assert.equal(formatStrictNoToSummary(1), "1 listed");
    assert.equal(formatStrictNoToSummary(3), "3 listed");
  });
});
