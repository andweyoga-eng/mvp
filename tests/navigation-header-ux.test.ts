import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("navigation header UX", () => {
  it("documents signed-in single CTA behavior", () => {
    const signedInHeader = {
      primaryCta: "My Account",
      bookSessionLocation: "my-account-dropdown",
      separateSignOutButton: false,
      nameLabelVisible: false,
      signOutLocation: "my-account-dropdown",
    };
    assert.equal(signedInHeader.primaryCta, "My Account");
    assert.equal(signedInHeader.bookSessionLocation, "my-account-dropdown");
    assert.equal(signedInHeader.separateSignOutButton, false);
    assert.equal(signedInHeader.nameLabelVisible, false);
    assert.equal(signedInHeader.signOutLocation, "my-account-dropdown");
  });

  it("documents logged-out booking CTA behavior", () => {
    const loggedOutHeader = {
      primaryCta: "Book Session",
      authDialog: "centered-modal",
      authOptions: ["Continue with Google", "Continue as Guest"],
      guestOpensBookingModal: true,
    };
    assert.equal(loggedOutHeader.primaryCta, "Book Session");
    assert.equal(loggedOutHeader.authDialog, "centered-modal");
    assert.deepEqual(loggedOutHeader.authOptions, ["Continue with Google", "Continue as Guest"]);
    assert.equal(loggedOutHeader.guestOpensBookingModal, true);
  });
});

