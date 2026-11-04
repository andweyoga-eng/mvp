import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatProgramListingPriceLabel,
  summarizeListingPrice,
} from "../shared/program-listing-price.ts";

describe("program listing price", () => {
  it("uses Starting at for multiple program prices and the lowest amount", () => {
    const listing = summarizeListingPrice([600_000, 3_600]);
    assert.deepEqual(listing, { optionCount: 2, minRupees: 36 });
    assert.equal(formatProgramListingPriceLabel(listing), "Starting at ₹36");
  });

  it("shows a plain price for a single option including Flexi-with-one-SKU", () => {
    const listing = summarizeListingPrice([600_000]);
    assert.equal(formatProgramListingPriceLabel(listing), "₹6,000");
  });

  it("returns null when there are no active programs", () => {
    assert.equal(summarizeListingPrice([]), null);
    assert.equal(formatProgramListingPriceLabel(null), null);
  });
});
