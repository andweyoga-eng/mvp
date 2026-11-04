import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatSessionCountSummary,
  formatSubscriptionUsage,
  memberSessionCountsBalance,
  subscriptionSessionBalance,
  summarizeMemberSessionStatuses,
} from "../shared/member-session-counts.ts";

describe("summarizeMemberSessionStatuses", () => {
  it("sums upcoming, completed, and cancelled into totalScheduled", () => {
    const summary = summarizeMemberSessionStatuses([
      { status: "upcoming" },
      { status: "upcoming" },
      { status: "completed" },
      { status: "cancelled" },
    ]);
    assert.equal(summary.upcoming, 2);
    assert.equal(summary.completed, 1);
    assert.equal(summary.cancelled, 1);
    assert.equal(summary.totalScheduled, 4);
    assert.equal(memberSessionCountsBalance(summary), true);
  });
});

describe("subscriptionSessionBalance", () => {
  it("remaining excludes utilized, refunded, and waived", () => {
    const balance = subscriptionSessionBalance({
      totalSessions: 8,
      utilizedSessions: 2,
      refundedSessions: 1,
      waivedSessions: 0,
    });
    assert.equal(balance.remaining, 5);
    assert.match(formatSubscriptionUsage(balance), /2 of 8 completed · 5 remaining/);
  });

  it("never returns negative remaining", () => {
    const balance = subscriptionSessionBalance({
      totalSessions: 4,
      utilizedSessions: 5,
      refundedSessions: 0,
      waivedSessions: 0,
    });
    assert.equal(balance.remaining, 0);
  });
});

describe("formatSessionCountSummary", () => {
  it("omits cancelled when zero", () => {
    const text = formatSessionCountSummary({
      totalScheduled: 3,
      upcoming: 2,
      completed: 1,
      cancelled: 0,
    });
    assert.match(text, /3 scheduled/);
    assert.doesNotMatch(text, /cancelled/);
  });
});
