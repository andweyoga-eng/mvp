import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyMemberSessionStatus } from "../shared/member-session-status.ts";

const NOW = new Date("2026-05-19T12:00:00.000Z");

describe("classifyMemberSessionStatus", () => {
  it("marks live sessions as upcoming with isLive", () => {
    const out = classifyMemberSessionStatus({
      mappingStatus: "upcoming",
      classCancelledAt: null,
      sessionStart: "2026-05-19T11:30:00.000Z",
      durationMinutes: 60,
      now: NOW,
    });
    assert.equal(out.status, "upcoming");
    assert.equal(out.isLive, true);
  });

  it("marks completed only after session end", () => {
    const out = classifyMemberSessionStatus({
      mappingStatus: "upcoming",
      classCancelledAt: null,
      sessionStart: "2026-05-19T10:00:00.000Z",
      durationMinutes: 60,
      now: NOW,
    });
    assert.equal(out.status, "completed");
    assert.equal(out.isLive, false);
  });

  it("marks admin-cancelled sessions as cancelled", () => {
    const out = classifyMemberSessionStatus({
      mappingStatus: "upcoming",
      classCancelledAt: "2026-05-19T11:00:00.000Z",
      sessionStart: "2026-05-19T13:00:00.000Z",
      durationMinutes: 60,
      now: NOW,
    });
    assert.equal(out.status, "cancelled");
    assert.equal(out.isLive, false);
  });
});
