import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSessionBadgeLabel } from "../client/src/lib/session-badges.ts";

describe("getSessionBadgeLabel", () => {
  it("labels trial sessions separately from drop-in", () => {
    assert.equal(getSessionBadgeLabel("trial", "online"), "Online trial");
    assert.equal(getSessionBadgeLabel("trial", "offline"), "Offline trial");
    assert.equal(getSessionBadgeLabel("drop_in", "online"), "Online drop-in");
    assert.equal(getSessionBadgeLabel("drop_in", "offline"), "Offline drop-in");
  });

  it("labels recurring sessions as regular batch", () => {
    assert.equal(getSessionBadgeLabel("recurring", "online"), "Regular batch");
  });
});
