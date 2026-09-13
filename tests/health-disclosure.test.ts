import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("health disclosure limits", async () => {
  const {
    HEALTH_NO_CONCERNS_TEXT,
    MAX_HEALTH_CONCERNS_CHARS,
    confirmedHealthFromSavedText,
    confirmedHealthToUpdateText,
    isHealthConcernsTextComplete,
    isHealthDisclosureComplete,
    validateHealthDisclosureDraft,
  } = await import("../shared/health-disclosure.ts");

  it("accepts no-concerns text", () => {
    assert.equal(isHealthDisclosureComplete(HEALTH_NO_CONCERNS_TEXT), true);
  });

  it("accepts concerns text up to 500 characters", () => {
    const text = "a".repeat(500);
    assert.equal(isHealthConcernsTextComplete(text), true);
    assert.equal(isHealthDisclosureComplete(text), true);
  });

  it("rejects concerns text over 500 characters", () => {
    const text = "a".repeat(501);
    assert.equal(isHealthConcernsTextComplete(text), false);
    assert.equal(isHealthDisclosureComplete(text), false);
  });

  it("rejects empty concerns draft", () => {
    const result = validateHealthDisclosureDraft("concerns", "   ");
    assert.equal(result.valid, false);
  });

  it("rejects concerns draft over the limit", () => {
    const result = validateHealthDisclosureDraft("concerns", "a".repeat(501));
    assert.equal(result.valid, false);
    assert.match(result.message ?? "", /500/);
  });

  it("exports max limit constant", () => {
    assert.equal(MAX_HEALTH_CONCERNS_CHARS, 500);
  });

  it("derives confirmed state from saved DB text", () => {
    assert.deepEqual(confirmedHealthFromSavedText(null, []), {
      choice: "",
      concernsText: "",
      documentUrls: [],
    });
    assert.deepEqual(confirmedHealthFromSavedText(HEALTH_NO_CONCERNS_TEXT, []), {
      choice: "none",
      concernsText: "",
      documentUrls: [],
    });
    assert.deepEqual(confirmedHealthFromSavedText("Knee injury details", ["doc"]), {
      choice: "concerns",
      concernsText: "Knee injury details",
      documentUrls: ["doc"],
    });
  });

  it("maps confirmed state back to persisted health text", () => {
    assert.equal(
      confirmedHealthToUpdateText({
        choice: "none",
        concernsText: "",
        documentUrls: [],
      }),
      HEALTH_NO_CONCERNS_TEXT,
    );
    assert.equal(
      confirmedHealthToUpdateText({
        choice: "concerns",
        concernsText: "  Back pain  ",
        documentUrls: [],
      }),
      "Back pain",
    );
    assert.equal(
      confirmedHealthToUpdateText({
        choice: "",
        concernsText: "",
        documentUrls: [],
      }),
      "",
    );
  });
});
