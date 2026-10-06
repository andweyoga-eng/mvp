import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSessionEndTime,
  isSessionWindowOpen,
} from "../shared/session-window.ts";

const NOW = new Date("2026-05-19T12:00:00.000Z");

describe("session window (start + duration)", () => {
  it("keeps in-progress sessions visible until duration ends", () => {
    assert.equal(
      isSessionWindowOpen("2026-05-19T11:14:00.000Z", 60, new Date("2026-05-19T11:17:00.000Z")),
      true,
    );
    assert.equal(
      isSessionWindowOpen("2026-05-19T11:14:00.000Z", 60, new Date("2026-05-19T12:14:01.000Z")),
      false,
    );
  });

  it("computes end time from class type duration", () => {
    const end = getSessionEndTime("2026-05-19T11:14:00.000Z", 45);
    assert.equal(end.toISOString(), "2026-05-19T11:59:00.000Z");
  });
});
