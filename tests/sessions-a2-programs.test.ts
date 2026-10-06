import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPurgeAllowed,
  hasPurgeDestructiveOptIn,
  isLocalDatabaseHost,
  parseDatabaseHost,
} from "../shared/purge-safety.ts";
import {
  classTypeNameKey,
  classTypeNamesCollide,
  formatClassTypeOptionLabel,
  normalizeClassTypeName,
} from "../shared/class-type-name.ts";
import {
  computeProgramTotalSessions,
  programPerSessionDivisibility,
  programRupeesToPaise,
  validateProgramShape,
} from "../shared/programs.ts";
import { isSessionDeleteFormSubmittable } from "../shared/admin-session-actions.ts";

describe("purge-safety guard B", () => {
  it("allows local database without opt-in", () => {
    assert.doesNotThrow(() =>
      assertPurgeAllowed({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://user:pass@localhost:5432/awy",
      }),
    );
  });

  it("refuses production NODE_ENV always", () => {
    assert.throws(
      () =>
        assertPurgeAllowed({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://user:pass@localhost:5432/awy",
          I_UNDERSTAND_THIS_DELETES_DATA: "1",
        }),
      /NODE_ENV=production/,
    );
  });

  it("refuses remote host without opt-in", () => {
    assert.throws(
      () =>
        assertPurgeAllowed({
          NODE_ENV: "development",
          DATABASE_URL: "postgres://user:pass@containers-us-west.railway.app:5432/railway",
        }),
      /I_UNDERSTAND_THIS_DELETES_DATA/,
    );
  });

  it("allows remote host with explicit opt-in", () => {
    assert.doesNotThrow(() =>
      assertPurgeAllowed({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://user:pass@containers-us-west.railway.app:5432/railway",
        I_UNDERSTAND_THIS_DELETES_DATA: "1",
      }),
    );
    assert.equal(hasPurgeDestructiveOptIn({ I_UNDERSTAND_THIS_DELETES_DATA: "1" }), true);
  });

  it("parses hosts and local detection", () => {
    assert.equal(parseDatabaseHost("postgres://u:p@127.0.0.1:5432/db"), "127.0.0.1");
    assert.equal(isLocalDatabaseHost("localhost"), true);
    assert.equal(isLocalDatabaseHost("railway.app"), false);
  });
});

describe("class-type name uniqueness helpers", () => {
  it("normalizes and compares case-insensitively", () => {
    assert.equal(normalizeClassTypeName("  Mudit   Yoga  "), "Mudit Yoga");
    assert.equal(classTypeNameKey("Mudit Yoga"), "mudit yoga");
    assert.equal(classTypeNamesCollide("Mudit Yoga", "mudit yoga"), true);
    assert.equal(classTypeNamesCollide("Mudit Yoga", "Mudit Yoga Flexi"), false);
  });

  it("formats picker labels with short id", () => {
    const label = formatClassTypeOptionLabel({
      id: "abcdefgh-1234",
      name: "Mudit Yoga",
      duration: 60,
    });
    assert.match(label, /Mudit Yoga/);
    assert.match(label, /#abcdefgh/);
    assert.match(label, /60min/);
    assert.equal(label.includes("Rs."), false);
  });
});

describe("program pricing helpers", () => {
  it("computes total sessions and paise", () => {
    assert.equal(computeProgramTotalSessions(3, 12), 36);
    assert.equal(programRupeesToPaise(14400), 1_440_000);
  });

  it("soft-warns when price does not divide evenly", () => {
    const even = programPerSessionDivisibility(1_440_000, 36);
    assert.equal(even.dividesEvenly, true);
    assert.equal(even.warning, null);

    const uneven = programPerSessionDivisibility(499_900, 36);
    assert.equal(uneven.dividesEvenly, false);
    assert.ok(uneven.warning);
  });

  it("validates trial/drop_in shape", () => {
    assert.equal(
      validateProgramShape({ kind: "trial", sessionsPerWeek: 2, durationWeeks: 1 }),
      "Trial and drop-in programs must be 1 session per week for 1 week",
    );
    assert.equal(
      validateProgramShape({ kind: "recurring", sessionsPerWeek: 3, durationWeeks: 12 }),
      null,
    );
  });
});

describe("booked session hard-delete form", () => {
  it("still allows empty-session delete form", () => {
    assert.equal(isSessionDeleteFormSubmittable("cleanup empty", "000000", 0, ""), true);
  });
});
