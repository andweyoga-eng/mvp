import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accountErasureSchema } from "../shared/consent.ts";
import {
  buildConsentCategoryStatuses,
  ERASURE_GRACE_DAYS,
  requestMeta,
  scheduledErasureDate,
} from "../server/consent.ts";

describe("erasure scheduling", () => {
  it("adds the configured grace period and preserves time of day", () => {
    const from = new Date("2026-07-03T10:15:30.123Z");
    const scheduled = scheduledErasureDate(from);

    assert.equal(ERASURE_GRACE_DAYS, 30);
    assert.equal(scheduled.toISOString(), "2026-08-02T10:15:30.123Z");
  });

  it("handles month and year boundaries with normal JS date rollover", () => {
    const cases = [
      ["2026-01-31T09:00:00.000Z", "2026-03-02T09:00:00.000Z"],
      ["2024-02-29T09:00:00.000Z", "2024-03-30T09:00:00.000Z"],
      ["2026-12-15T09:00:00.000Z", "2027-01-14T09:00:00.000Z"],
    ] as const;

    for (const [fromIso, expectedIso] of cases) {
      assert.equal(scheduledErasureDate(new Date(fromIso)).toISOString(), expectedIso);
    }
  });
});

describe("accountErasureSchema", () => {
  it("accepts the exact confirmation contract", () => {
    const result = accountErasureSchema.safeParse({
      confirmation: "ERASE",
      acknowledged: true,
    });
    assert.equal(result.success, true);
  });

  it("rejects case changes, whitespace, empty values, and missing acknowledgement", () => {
    const invalidCases = [
      { confirmation: "erase", acknowledged: true },
      { confirmation: "Erase", acknowledged: true },
      { confirmation: " ERASE ", acknowledged: true },
      { confirmation: "", acknowledged: true },
      { confirmation: "ERASE", acknowledged: false },
      { confirmation: "ERASE" },
    ];

    for (const payload of invalidCases) {
      assert.equal(accountErasureSchema.safeParse(payload).success, false);
    }
  });
});

describe("buildConsentCategoryStatuses", () => {
  it("treats the newest consent row as the source of truth even when rows are out of order", () => {
    const categories = buildConsentCategoryStatuses([
      {
        consentType: "health_data",
        action: "opt_out",
        timestampUtc: new Date("2026-04-02T00:00:00.000Z"),
        consentVersion: "v1",
      },
      {
        consentType: "health_data",
        action: "opt_in",
        timestampUtc: new Date("2026-04-03T00:00:00.000Z"),
        consentVersion: "v2",
      },
      {
        consentType: "terms",
        action: "opt_in",
        timestampUtc: new Date("2026-04-01T00:00:00.000Z"),
        consentVersion: "v1",
      },
    ]);

    const health = categories.find((row) => row.consentType === "health_data");
    const terms = categories.find((row) => row.consentType === "terms");

    assert.equal(health?.status, "active");
    assert.equal(health?.lastAction, "opt_in");
    assert.equal(health?.consentVersion, "v2");
    assert.equal(terms?.status, "active");
  });
});

describe("requestMeta", () => {
  it("uses the first x-forwarded-for hop and captures the user agent", () => {
    const meta = requestMeta({
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.1.1.5",
        "user-agent": "erasure-test/1.0",
      },
      socket: { remoteAddress: "127.0.0.1" },
    } as never);

    assert.deepEqual(meta, {
      ipAddress: "203.0.113.10",
      userAgent: "erasure-test/1.0",
    });
  });

  it("falls back to null-safe values when proxy headers are missing", () => {
    const meta = requestMeta({
      headers: {},
      socket: { remoteAddress: undefined },
    } as never);

    assert.deepEqual(meta, {
      ipAddress: null,
      userAgent: null,
    });
  });
});
