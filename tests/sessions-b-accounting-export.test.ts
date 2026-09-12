import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSubscriptionAccrualExportRow,
  formatSubscriptionAccrualCsv,
  subtractRupees2dp,
} from "../shared/accounting-export";

describe("Part B Option B — CA accrual export", () => {
  it("matches CA worked example: ₹10,000 / 36 after 20 consumed", () => {
    const row = buildSubscriptionAccrualExportRow({
      subscriptionId: "sub-1",
      userEmail: "member@example.com",
      totalPaidPaise: 1_000_000,
      sessionsPurchased: 36,
      perSessionAllocation: "277.77777778",
      sessionsConsumed: 20,
      sessionsScheduled: 16,
      sessionsUnscheduled: 0,
      sessionsCredited: 0,
    });
    assert.ok(row);
    assert.equal(row.totalPaidRupees, "10000.00");
    assert.equal(row.perSessionAllocation, "277.77777778");
    assert.equal(row.recognisedRevenueRupees, "5555.56");
    assert.equal(row.refundedRupees, "0.00");
    assert.equal(row.deferredLiabilityRupees, "4444.44");
    assert.equal(row.sessionsRemainingUndelivered, 16);
  });

  it("after refund of remaining 16, deferred is zero and refund matches CA", () => {
    const row = buildSubscriptionAccrualExportRow({
      subscriptionId: "sub-1",
      totalPaidPaise: 1_000_000,
      sessionsPurchased: 36,
      perSessionAllocation: "277.77777778",
      sessionsConsumed: 20,
      sessionsScheduled: 0,
      sessionsUnscheduled: 0,
      sessionsCredited: 16,
    });
    assert.ok(row);
    assert.equal(row.recognisedRevenueRupees, "5555.56");
    assert.equal(row.refundedRupees, "4444.44");
    assert.equal(row.deferredLiabilityRupees, "0.00");
    assert.equal(row.sessionsRemainingUndelivered, 0);
  });

  it("recomputes allocation when column is null", () => {
    const row = buildSubscriptionAccrualExportRow({
      subscriptionId: "sub-2",
      totalPaidPaise: 1_000_000,
      sessionsPurchased: 36,
      perSessionAllocation: null,
      sessionsConsumed: 0,
      sessionsScheduled: 36,
      sessionsUnscheduled: 0,
      sessionsCredited: 0,
    });
    assert.ok(row);
    assert.equal(row.perSessionAllocation, "277.77777778");
    assert.equal(row.recognisedRevenueRupees, "0.00");
    assert.equal(row.deferredLiabilityRupees, "10000.00");
  });

  it("subtractRupees2dp floors at zero", () => {
    assert.equal(subtractRupees2dp("100.00", "100.01"), "0.00");
    assert.equal(subtractRupees2dp("5555.56", "5555.56"), "0.00");
  });

  it("CSV includes header and recognised column", () => {
    const row = buildSubscriptionAccrualExportRow({
      subscriptionId: "sub-csv",
      userEmail: "a@b.com",
      totalPaidPaise: 1_000_000,
      sessionsPurchased: 36,
      perSessionAllocation: "277.77777778",
      sessionsConsumed: 20,
      sessionsScheduled: 16,
      sessionsUnscheduled: 0,
      sessionsCredited: 0,
    });
    assert.ok(row);
    const csv = formatSubscriptionAccrualCsv([row]);
    assert.match(csv, /^subscription_id,/);
    assert.match(csv, /recognised_revenue_rupees/);
    assert.match(csv, /5555\.56/);
    assert.match(csv, /sub-csv/);
  });
});
