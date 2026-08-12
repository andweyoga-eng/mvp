import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertFuelConfigSafe,
  averageDailyTotalsVsTarget,
  buildYoutubeEmbedUrl,
  dayStatus,
  DEFAULT_FUEL_MEAL_PLAN,
  FUEL_SAFETY_FLOOR_CAL,
  adminFuelDailyMediaSchema,
  adminFuelRecipeSchema,
  matchMealSlot,
  shouldShowDayVerdict,
  signedDelta,
} from "../shared/fuel.ts";

describe("andWeFuel business rules", () => {
  it("matches meal slots by local time band", () => {
    assert.equal(matchMealSlot(DEFAULT_FUEL_MEAL_PLAN, "08:00")?.label, "Breakfast");
    assert.equal(matchMealSlot(DEFAULT_FUEL_MEAL_PLAN, "12:30")?.label, "Lunch");
    assert.equal(matchMealSlot(DEFAULT_FUEL_MEAL_PLAN, "23:00"), null);
  });

  it("scores day bands against target and deficit", () => {
    assert.equal(dayStatus(1400, 1500, 300), "on_track");
    assert.equal(dayStatus(1500, 1500, 300), "on_track");
    assert.equal(dayStatus(1200, 1500, 300), "on_track");
    assert.equal(dayStatus(1199, 1500, 300), "under");
    assert.equal(dayStatus(1501, 1500, 300), "over");
  });

  it("requires override when effective floor is below safety rail", () => {
    const blocked = assertFuelConfigSafe(1500, 600);
    assert.equal(blocked.ok, false);
    const ok = assertFuelConfigSafe(1500, 600, "Clinical plan under coach care");
    assert.equal(ok.ok, true);
    assert.equal(FUEL_SAFETY_FLOOR_CAL, 1200);
  });

  it("shows verdict only after last meal slot is logged", () => {
    const plan = DEFAULT_FUEL_MEAL_PLAN;
    assert.equal(
      shouldShowDayVerdict({ plan, loggedSlotIndexes: [0, 1] }),
      false,
    );
    assert.equal(
      shouldShowDayVerdict({ plan, loggedSlotIndexes: [0, 3] }),
      true,
    );
    assert.equal(
      shouldShowDayVerdict({ plan, loggedSlotIndexes: [0], dayClosed: true }),
      true,
    );
  });

  it("averages daily totals versus target", () => {
    assert.equal(averageDailyTotalsVsTarget([1400, 1600], 1500), 0);
    assert.equal(signedDelta(1630, 1500), 130);
  });

  it("accepts recipe payloads with blank or https image URLs and rounded kcal", () => {
    const base = {
      forDate: "2026-08-03",
      title: "Millet dosa",
      teaser: "Light breakfast",
      ingredients: "millet, water",
      method: "ferment and cook",
    };
    assert.equal(adminFuelRecipeSchema.safeParse({ ...base, imageUrl: null, approxKcal: null }).success, true);
    assert.equal(adminFuelRecipeSchema.safeParse({ ...base, imageUrl: "", approxKcal: "" }).success, true);
    assert.equal(
      adminFuelRecipeSchema.safeParse({
        ...base,
        imageUrl: "https://example.com/a.jpg",
        approxKcal: "120.6",
      }).success,
      true,
    );
    assert.equal(
      adminFuelRecipeSchema.safeParse({ ...base, imageUrl: "www.example.com/a.jpg" }).success,
      false,
    );
  });

  it("normalizes YouTube shorts URLs to embed ids", () => {
    const parsed = adminFuelDailyMediaSchema.safeParse({
      forDate: "2026-08-03",
      provider: "youtube",
      embedId: "https://youtube.com/shorts/z_yGX89nLjY?feature=share",
      title: "Healthy Dessert",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.embedId, "z_yGX89nLjY");
    }
    assert.equal(
      buildYoutubeEmbedUrl("https://youtube.com/shorts/z_yGX89nLjY?feature=share"),
      "https://www.youtube.com/embed/z_yGX89nLjY",
    );
  });
});
