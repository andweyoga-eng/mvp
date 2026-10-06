import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchFuelFoodCatalog } from "../server/fuel-food-catalog";

describe("fuel food catalog autocomplete", () => {
  it("finds ICMR ingredient by English name", () => {
    const hits = searchFuelFoodCatalog("bajra", 5);
    assert.ok(hits.some((h) => /bajra/i.test(h.name)));
    assert.equal(hits[0]?.source, "catalog");
  });

  it("finds dish via alias-ish substring", () => {
    const hits = searchFuelFoodCatalog("idli", 8);
    assert.ok(hits.length > 0);
    assert.ok(hits.every((h) => h.source === "catalog"));
  });

  it("returns empty for blank query", () => {
    assert.deepEqual(searchFuelFoodCatalog("  ", 5), []);
  });
});
