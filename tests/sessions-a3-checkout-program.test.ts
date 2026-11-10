import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeProgramHorizon,
  formatProgramCheckoutLabel,
  guestMayPurchaseProgramKind,
  programHasFee,
  sessionFrequencyToProgramKind,
} from "../shared/checkout-program.ts";
import { programRupeesToPaise } from "../shared/programs.ts";

describe("checkout-program A3 helpers", () => {
  it("maps session frequency to program kind", () => {
    assert.equal(sessionFrequencyToProgramKind("trial"), "trial");
    assert.equal(sessionFrequencyToProgramKind("drop_in"), "drop_in");
    assert.equal(sessionFrequencyToProgramKind("recurring"), "recurring");
    assert.equal(sessionFrequencyToProgramKind("other"), null);
  });

  it("restricts guests to trial/drop_in", () => {
    assert.equal(guestMayPurchaseProgramKind("trial"), true);
    assert.equal(guestMayPurchaseProgramKind("drop_in"), true);
    assert.equal(guestMayPurchaseProgramKind("recurring"), false);
  });

  it("formats checkout labels and fee check", () => {
    assert.equal(programHasFee({ pricePaise: 0 }), false);
    assert.equal(programHasFee({ pricePaise: 45000 }), true);
    assert.match(
      formatProgramCheckoutLabel({
        kind: "recurring",
        sessionsPerWeek: 2,
        durationWeeks: 4,
        totalSessions: 8,
        pricePaise: programRupeesToPaise(451),
      }),
      /2\/week × 4 weeks/,
    );
  });

  it("computes program horizon from duration weeks", () => {
    const start = new Date("2026-08-03T01:30:00.000Z");
    const { horizonStartAt, horizonEndAt } = computeProgramHorizon({
      startAt: start,
      durationWeeks: 4,
    });
    assert.equal(horizonStartAt.toISOString(), start.toISOString());
    const days =
      (horizonEndAt.getTime() - horizonStartAt.getTime()) / (24 * 60 * 60 * 1000);
    assert.ok(days >= 27 && days < 29);
  });
});
