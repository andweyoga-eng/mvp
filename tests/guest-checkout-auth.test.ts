import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

describe("guest checkout auth tokens", () => {
  before(() => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-jwt-secret-for-guest-checkout-auth-tests-min-32-chars";
    }
  });

  it("verifyToken rejects guest checkout JWTs", async () => {
    const { generateGuestCheckoutToken, verifyToken } = await import("../server/auth.ts");
    const guestToken = generateGuestCheckoutToken("booking-123");
    assert.equal(verifyToken(guestToken), null);
  });

  it("verifyGuestCheckoutToken accepts guest checkout JWTs", async () => {
    const { generateGuestCheckoutToken, verifyGuestCheckoutToken } = await import(
      "../server/auth.ts"
    );
    const guestToken = generateGuestCheckoutToken("booking-456");
    assert.deepEqual(verifyGuestCheckoutToken(guestToken), { bookingId: "booking-456" });
  });

  it("verifyToken accepts member JWTs with userId", async () => {
    const { generateToken, verifyToken } = await import("../server/auth.ts");
    const memberToken = generateToken("user-789");
    assert.deepEqual(verifyToken(memberToken), { userId: "user-789" });
  });

  it("requireBookingAuth prefers guest Authorization token over member cookie", async () => {
    const { generateToken, generateGuestCheckoutToken, requireBookingAuth } = await import(
      "../server/auth.ts"
    );
    const guestToken = generateGuestCheckoutToken("booking-guest-1");
    const memberToken = generateToken("user-member-1");

    const req = {
      cookies: { authToken: memberToken },
      headers: { authorization: `Bearer ${guestToken}` },
    } as any;

    let nextCalled = false;
    await requireBookingAuth(req, { status: () => ({ json: () => undefined }) } as any, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.guestCheckoutBookingId, "booking-guest-1");
    assert.equal(req.user, undefined);
  });
});
