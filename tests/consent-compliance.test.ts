import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildConsentRequirement,
  calculateAge,
  isAdult,
  isValidDateOfBirth,
  MINIMUM_AGE_YEARS,
  type ConsentCategoryStatus,
} from "../shared/consent.ts";
import { LEGAL_CONFIG, formatRegisteredOffice } from "../shared/legal-config.ts";
import { buildConsentCategoryStatuses } from "../server/consent.ts";

function activeCategory(
  consentType: ConsentCategoryStatus["consentType"],
  consentVersion: string = LEGAL_CONFIG.documentVersion,
): ConsentCategoryStatus {
  return {
    consentType,
    status: "active",
    lastAction: "opt_in",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    consentVersion,
  };
}

describe("consent age gate", () => {
  const ref = new Date("2026-06-30T12:00:00");

  it("accepts 18 on reference date", () => {
    assert.equal(isAdult("2008-06-30", ref), true);
    assert.equal(calculateAge("2008-06-30", ref), 18);
  });

  it("rejects under 18", () => {
    assert.equal(isAdult("2008-07-01", ref), false);
  });

  it("rejects invalid future DOB", () => {
    assert.equal(isValidDateOfBirth("2030-01-01"), false);
  });

  it("minimum age constant is 18", () => {
    assert.equal(MINIMUM_AGE_YEARS, 18);
  });
});

describe("legal config placeholders", () => {
  it("includes CIN and grievance officer email from compliance doc", () => {
    assert.equal(LEGAL_CONFIG.cin, "U86900KA2024OPC189315");
    assert.equal(LEGAL_CONFIG.grievanceOfficer.email, "arun@andweyoga.com");
    assert.match(formatRegisteredOffice(), /560060/);
    assert.equal(LEGAL_CONFIG.documentVersion, "v1.1.0_2026-07-06");
  });
});

describe("buildConsentRequirement", () => {
  const currentVersion = LEGAL_CONFIG.documentVersion;

  it("returns first_time when user has no consent logs (post-OAuth incomplete consent)", () => {
    const requirement = buildConsentRequirement([], LEGAL_CONFIG.documentVersion, false);
    assert.equal(requirement.requiresConsent, true);
    assert.equal(requirement.flow, "first_time");
    assert.deepEqual(requirement.requiredTypes, [
      "profile_booking",
      "terms",
      "age_declaration",
    ]);
  });

  it("returns first_time when a required consent is missing or inactive", () => {
    const requirement = buildConsentRequirement(
      [activeCategory("profile_booking"), activeCategory("terms")],
      currentVersion,
      false,
    );
    assert.equal(requirement.requiresConsent, true);
    assert.equal(requirement.flow, "first_time");
    assert.deepEqual(requirement.requiredTypes, [
      "profile_booking",
      "terms",
      "age_declaration",
    ]);
    assert.equal(requirement.requireDateOfBirth, true);
  });

  it("returns reconsent when consents are active but version is outdated", () => {
    const requirement = buildConsentRequirement(
      [
        activeCategory("profile_booking"),
        activeCategory("terms", "v0.9.0_old"),
        activeCategory("age_declaration"),
      ],
      currentVersion,
      true,
    );
    assert.equal(requirement.requiresConsent, true);
    assert.equal(requirement.flow, "reconsent");
    assert.deepEqual(requirement.requiredTypes, ["terms"]);
    assert.equal(requirement.requireDateOfBirth, false);
  });

  it("requires DOB on reconsent when age_declaration is outdated and DOB missing", () => {
    const requirement = buildConsentRequirement(
      [
        activeCategory("profile_booking"),
        activeCategory("terms"),
        activeCategory("age_declaration", "v0.9.0_old"),
      ],
      currentVersion,
      false,
    );
    assert.equal(requirement.flow, "reconsent");
    assert.deepEqual(requirement.requiredTypes, ["age_declaration"]);
    assert.equal(requirement.requireDateOfBirth, true);
  });

  it("returns complete when all required consents are active at current version", () => {
    const requirement = buildConsentRequirement(
      [
        activeCategory("profile_booking"),
        activeCategory("terms"),
        activeCategory("age_declaration"),
        { consentType: "health_data", status: "not_given", lastAction: null, lastUpdated: null, consentVersion: null },
      ],
      currentVersion,
      true,
    );
    assert.equal(requirement.requiresConsent, false);
    assert.equal(requirement.flow, null);
    assert.deepEqual(requirement.requiredTypes, []);
    assert.equal(requirement.requireDateOfBirth, false);
  });
});

describe("consent category status", () => {
  it("derives active vs withdrawn from latest log row", () => {
    const rows = buildConsentCategoryStatuses([
      {
        consentType: "health_data",
        action: "opt_in",
        timestampUtc: new Date("2026-01-01"),
        consentVersion: "v1",
      },
      {
        consentType: "health_data",
        action: "opt_out",
        timestampUtc: new Date("2026-02-01"),
        consentVersion: "v1",
      },
    ]);
    const health = rows.find((r) => r.consentType === "health_data");
    assert.equal(health?.status, "withdrawn");
  });
});
