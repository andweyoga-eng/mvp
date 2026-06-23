import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  guestSessionDetailsMessage,
  SMS_GATEWAY_READY,
  GUEST_CHECKOUT_TOKEN_STORAGE_KEY,
} from "../shared/guest-checkout.ts";

describe("guest checkout", () => {
  it("uses email-only copy when SMS gateway is not ready", () => {
    assert.equal(SMS_GATEWAY_READY, false);
    assert.equal(
      guestSessionDetailsMessage(),
      "Session details will be shared on your email.",
    );
  });

  it("exports guest checkout storage key", () => {
    assert.equal(GUEST_CHECKOUT_TOKEN_STORAGE_KEY, "guestCheckoutToken");
  });
});
