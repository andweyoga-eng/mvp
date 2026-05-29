import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSessionBadgeLabel } from "../client/src/lib/session-badges.ts";

describe("getSessionBadgeLabel", () => {
  it("labels trial sessions separately from drop-in", () => {
    assert.equal(getSessionBadgeLabel("trial", "online"), "Online Trial session");
    assert.equal(getSessionBadgeLabel("trial", "offline"), "Offline Trial session");
    assert.equal(getSessionBadgeLabel("drop_in", "online"), "Online Drop In");
    assert.equal(getSessionBadgeLabel("drop_in", "offline"), "Offline Drop In");
  });

  it("labels recurring sessions as regular batch", () => {
    assert.equal(getSessionBadgeLabel("recurring", "online"), "Regular batch");
  });
});
