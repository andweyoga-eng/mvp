import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getFirstIncompleteAccountAnchor,
  getFirstIncompleteBookingAnchor,
  getMemberReadiness,
  signedInBookingProfileBlock,
} from "../shared/profileCompleteness.ts";
import { HEALTH_NO_CONCERNS_TEXT } from "../shared/health-disclosure.ts";

const l1 = {
  emailVerified: true,
  name: "Asha",
  primaryMobile: "",
  primaryMobileCountryCode: "+91",
  emergencyMobile: "",
  emergencyMobileCountryCode: "+91",
  healthUpdateText: "",
};

const l2 = {
  ...l1,
  primaryMobile: "9988776655",
  emergencyMobile: "8877665544",
};

describe("SPEC-ONBOARD-01 readiness ladder", () => {
  it("returns account when consent and date of birth are done but mobile is missing", () => {
    assert.equal(getMemberReadiness(l1, { requiresConsent: false }), "account");
  });

  it("returns bookable when contact is valid and Health History is empty", () => {
    assert.equal(getMemberReadiness(l2), "bookable");
  });

  it("returns practice_ready for No Health issues now when health consent is active", () => {
    assert.equal(
      getMemberReadiness(
        { ...l2, healthUpdateText: HEALTH_NO_CONCERNS_TEXT },
        { healthConsentActive: true },
      ),
      "practice_ready",
    );
  });

  it("stays bookable when Health History is saved but health consent is inactive", () => {
    assert.equal(
      getMemberReadiness(
        { ...l2, healthUpdateText: HEALTH_NO_CONCERNS_TEXT },
        { healthConsentActive: false },
      ),
      "bookable",
    );
  });

  it("returns none while consent is pending", () => {
    assert.equal(getMemberReadiness(l2, { requiresConsent: true }), "none");
  });

  it("returns profile from the booking anchor when mobile is missing", () => {
    assert.equal(getFirstIncompleteBookingAnchor(l1), "profile");
  });

  it("returns profile from the booking anchor when the emergency number is invalid", () => {
    assert.equal(
      getFirstIncompleteBookingAnchor({ ...l2, emergencyMobile: "123" }),
      "profile",
    );
  });

  it("returns null from the account anchor when consent is done, even with no mobile", () => {
    assert.equal(getFirstIncompleteAccountAnchor(l1), null);
  });

  it("returns health from the booking anchor only when requireHealth is set and text is empty", () => {
    assert.equal(getFirstIncompleteBookingAnchor(l2, { requireHealth: true }), "health");
    assert.equal(
      getFirstIncompleteBookingAnchor(
        { ...l2, healthUpdateText: HEALTH_NO_CONCERNS_TEXT },
        { requireHealth: true },
      ),
      null,
    );
  });
});

describe("signed-in booking profile block", () => {
  it("rejects a trial booking when emergency contact is missing", () => {
    const block = signedInBookingProfileBlock(
      { ...l2, emergencyMobile: "" },
      { mustBeSignedIn: false },
    );
    assert.equal(block?.code, "profile_incomplete");
    assert.equal(block?.requiresHealthUpdate, false);
    assert.equal(block?.redirectTo, "/my-account#profile");
  });

  it("accepts a trial booking when mobile and emergency contact are valid", () => {
    assert.equal(signedInBookingProfileBlock(l2, { mustBeSignedIn: false }), null);
  });

  it("requires Health History for a paid recurring booking after contact is complete", () => {
    const block = signedInBookingProfileBlock(l2, { mustBeSignedIn: true });
    assert.equal(block?.requiresHealthUpdate, true);
    assert.equal(block?.redirectTo, "/my-account#health");
  });

  it("accepts a paid booking once Health History is saved", () => {
    assert.equal(
      signedInBookingProfileBlock(
        { ...l2, healthUpdateText: HEALTH_NO_CONCERNS_TEXT },
        { mustBeSignedIn: true },
      ),
      null,
    );
  });
});
