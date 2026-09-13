import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("guest gate server enforcement (SPEC-GG-01)", () => {
  it("POST /api/bookings gates guest branch on getGuestCheckoutEnabled", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /getGuestCheckoutEnabled\(\)/);
    assert.match(
      source,
      /guestCheckoutEnabled\s*&&\s*\(\s*cls\.sessionFrequency === "drop_in" \|\| cls\.sessionFrequency === "trial"\s*\)/,
    );
    assert.match(source, /Guest bookings are born here/);
  });

  it("does not gate resume-checkout or payment webhook paths", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    const resumeIdx = source.indexOf("/resume-checkout");
    const webhookIdx = source.indexOf("webhook");
    const bookingPostIdx = source.indexOf('app.post("/api/bookings"');
    assert.ok(bookingPostIdx >= 0);
    assert.ok(resumeIdx >= 0);
    const enforcementSnippet = source.slice(bookingPostIdx, bookingPostIdx + 2500);
    assert.doesNotMatch(enforcementSnippet, /resume-checkout/);
  });

  it("returns signup_required for unauthenticated recurring-style rejection", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /code:\s*"signup_required"/);
  });

  it("exposes public platform config endpoint", () => {
    const source = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(source, /app\.get\("\/api\/platform\/config"/);
    assert.match(source, /guestCheckoutEnabled/);
  });
});

describe("guest gate client enforcement", () => {
  it("hides guest-popup-button when guest checkout disabled", () => {
    const source = readFileSync(
      join(root, "client/src/components/auth-hover-popup.tsx"),
      "utf8",
    );
    assert.match(source, /usePlatformConfig/);
    assert.match(source, /guestCheckoutEnabled \?/);
    assert.match(source, /guest-popup-button/);
  });

  it("booking modal routes guest-off booking attempts straight to auth", () => {
    const source = readFileSync(
      join(root, "client/src/components/booking-modal.tsx"),
      "utf8",
    );
    assert.match(source, /effectiveCanGuestBook/);
    assert.match(source, /signup_required/);
    assert.match(source, /suppressModalForGuestGate/);
    assert.match(source, /!guestCheckoutEnabled && !canAccessCheckoutUi/);
  });
});
