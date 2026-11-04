import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateGuestEmail,
  validateGuestField,
  validateGuestForm,
  validateGuestName,
  validateGuestPhoneField,
  guestFormHasErrors,
  firstGuestFormError,
} from "../shared/guest-booking-form.ts";

describe("guest-booking-form", () => {
  it("requires name", () => {
    assert.equal(validateGuestName(""), "Name is required");
    assert.equal(validateGuestName("  "), "Name is required");
    assert.equal(validateGuestName("Arun"), null);
  });

  it("validates email on blur-style checks", () => {
    assert.equal(validateGuestEmail(""), "Email is required");
    assert.equal(validateGuestEmail("not-an-email"), "Please enter a valid email address");
    assert.equal(validateGuestEmail("user@example.com"), null);
  });

  it("validates phone through guest phone rules", () => {
    assert.match(validateGuestPhoneField("") ?? "", /required/i);
    assert.equal(validateGuestPhoneField("9876543210"), null);
  });

  it("aggregates form errors", () => {
    const errors = validateGuestForm({ name: "", email: "bad", phone: "" });
    assert.equal(guestFormHasErrors(errors), true);
    assert.equal(firstGuestFormError(errors), "Name is required");
    assert.equal(validateGuestField("email", "bad"), "Please enter a valid email address");
  });
});
