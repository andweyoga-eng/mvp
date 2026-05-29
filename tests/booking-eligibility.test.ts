import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSessionBookable,
  isTrialDropInMidSession,
  TRIAL_DROPIN_MIDSESSION_MESSAGE,
} from "../shared/booking-eligibility.ts";

const NOW = new Date("2026-05-19T12:00:00.000Z");

describe("booking eligibility", () => {
  it("allows recurring sessions until duration ends", () => {
    assert.equal(
      isSessionBookable("2026-05-19T11:30:00.000Z", 60, "recurring", NOW),
      true,
    );
  });

  it("blocks trial/drop-in after session start", () => {
    assert.equal(isSessionBookable("2026-05-19T11:30:00.000Z", 60, "trial", NOW), false);
    assert.equal(isSessionBookable("2026-05-20T10:00:00.000Z", 60, "drop_in", NOW), true);
  });

  it("detects mid-session trial window", () => {
    assert.equal(
      isTrialDropInMidSession("2026-05-19T11:30:00.000Z", 60, "trial", NOW),
      true,
    );
    assert.equal(
      isTrialDropInMidSession("2026-05-19T10:00:00.000Z", 30, "trial", NOW),
      false,
    );
  });

  it("exports a friendly mid-session message", () => {
    assert.match(TRIAL_DROPIN_MIDSESSION_MESSAGE, /next scheduled session/i);
  });
});
