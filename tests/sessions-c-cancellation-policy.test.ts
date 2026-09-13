import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANCELLATION_POLICY_VERSION,
  computeRescheduleDeadline,
  isCurrentCancellationPolicyVersion,
  rupees2dpToPaise,
  RESCHEDULE_WINDOW_DAYS,
} from "../shared/cancellation-policy";
import { DEFAULT_SESSION_TERMS_AND_CONDITIONS } from "../shared/session-terms";
import { guestBookingConsentSchema } from "../shared/consent";

describe("Part C — cancellation policy + clickwrap", () => {
  it("pins current policy version id", () => {
    assert.equal(CANCELLATION_POLICY_VERSION, "cancellation-refund-v2.0");
    assert.equal(isCurrentCancellationPolicyVersion("cancellation-refund-v2.0"), true);
    assert.equal(isCurrentCancellationPolicyVersion("v1"), false);
  });

  it("deadline is max(cancel+30d, horizon_end)", () => {
    const cancelAt = new Date("2026-08-03T00:00:00.000Z");
    const nearHorizon = new Date("2026-08-10T00:00:00.000Z");
    const farHorizon = new Date("2026-10-01T00:00:00.000Z");
    const d1 = computeRescheduleDeadline({ cancelAt, horizonEndAt: nearHorizon });
    const expectedPlus30 = new Date(cancelAt);
    expectedPlus30.setUTCDate(expectedPlus30.getUTCDate() + RESCHEDULE_WINDOW_DAYS);
    assert.equal(d1.toISOString(), expectedPlus30.toISOString());
    const d2 = computeRescheduleDeadline({ cancelAt, horizonEndAt: farHorizon });
    assert.equal(d2.toISOString(), farHorizon.toISOString());
  });

  it("guest consent schema requires cancellation policy acceptance", () => {
    assert.throws(() =>
      guestBookingConsentSchema.parse({
        guestConsentProfile: true,
        guestConsentTerms: true,
        guestConsentAge: true,
        consentVersion: "v1",
      }),
    );
    const ok = guestBookingConsentSchema.parse({
      guestConsentProfile: true,
      guestConsentTerms: true,
      guestConsentAge: true,
      acceptCancellationPolicy: true,
      cancellationPolicyVersion: CANCELLATION_POLICY_VERSION,
      consentVersion: "v1",
    });
    assert.equal(ok.acceptCancellationPolicy, true);
  });

  it("default session terms no longer mention a credit wallet", () => {
    assert.doesNotMatch(DEFAULT_SESSION_TERMS_AND_CONDITIONS, /credit wallet|converted into credits/i);
    assert.match(DEFAULT_SESSION_TERMS_AND_CONDITIONS, /Cancellation, Refund and Rescheduling Policy/);
  });

  it("rupees2dpToPaise matches CA posting strings", () => {
    assert.equal(rupees2dpToPaise("5555.56"), 555_556);
    assert.equal(rupees2dpToPaise("4444.44"), 444_444);
  });
});
