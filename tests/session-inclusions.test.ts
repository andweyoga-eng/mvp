import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adminCreateClassSessionSchema } from "../shared/admin-validation.ts";
import {
  normalizeSessionCoverageText,
  parseSessionCoverageItems,
} from "../shared/session-inclusions.ts";

const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

describe("session coverage items", () => {
  it("splits lines and drops blanks and duplicates", () => {
    assert.deepEqual(
      parseSessionCoverageItems("Mat and props\n\n- Live guidance\nmat and props"),
      ["Mat and props", "Live guidance"],
    );
    assert.equal(normalizeSessionCoverageText("  \n  "), null);
    assert.equal(normalizeSessionCoverageText(null), null);
  });
});

describe("adminCreateClassSessionSchema — inclusions and exclusions", () => {
  const base = {
    classTypeId: "ct-1",
    instructorId: "ins-1",
    date: futureDate,
    maxCapacity: "10",
    googleMeetLink: "https://meet.google.com/abc-defg-hij",
    paymentMethod: "razorpay_link" as const,
    razorpayLink: "https://rzp.io/i/x",
    publishMode: "now" as const,
  };

  it("stores empty sections as null so older sessions still save", () => {
    const result = adminCreateClassSessionSchema.safeParse(base);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.inclusions, null);
      assert.equal(result.data.exclusions, null);
    }
  });

  it("normalizes one item per line for checkout", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      ...base,
      inclusions: " Mat and props \n\nLive guidance ",
      exclusions: "Personal therapy",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.inclusions, "Mat and props\nLive guidance");
      assert.equal(result.data.exclusions, "Personal therapy");
    }
  });

  it("rejects sections longer than 2000 characters", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      ...base,
      inclusions: "a".repeat(2001),
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path[0] === "inclusions"));
    }
  });
});
