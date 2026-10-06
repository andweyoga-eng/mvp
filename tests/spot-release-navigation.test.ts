import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("spot release navigation", () => {
  it("reserve page sends members to dashboard after releasing a hold", () => {
    const source = readFileSync(join(root, "client/src/pages/reserve.tsx"), "utf8");
    assert.match(source, /navigateToDashboardAfterSpotRelease/);
    assert.doesNotMatch(source, /setTimeout\(\(\) => setLocation\(exitPath\)/);
  });

  it("dashboard shows release confirmation toast when flagged", () => {
    const source = readFileSync(join(root, "client/src/pages/dashboard.tsx"), "utf8");
    assert.match(source, /consumeSpotReleasedFlag/);
    assert.match(source, /ReleaseSpotToast/);
  });

  it("logged-in booking modal release routes to dashboard", () => {
    const source = readFileSync(join(root, "client/src/components/booking-modal.tsx"), "utf8");
    assert.match(source, /handleReleaseSpot/);
    assert.match(source, /navigateToDashboardAfterSpotRelease\(setLocation\)/);
  });
});
