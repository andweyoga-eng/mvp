import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  guestBookingProcessingMessage,
  GUEST_BOOKING_CONFIRMED_MESSAGE,
  GUEST_QR_SUBMITTED_MESSAGE,
} from "../shared/guest-booking-conflict.ts";

describe("guest booking conflict messages", () => {
  it("uses longer TAT for QR manual verification", () => {
    assert.match(guestBookingProcessingMessage("qr"), /2 hours/);
  });

  it("uses short TAT for hosted Razorpay checkout", () => {
    assert.match(guestBookingProcessingMessage("razorpay_gateway"), /few minutes/);
  });

  it("exports confirmed and QR submitted copy", () => {
    assert.match(GUEST_BOOKING_CONFIRMED_MESSAGE, /already booked/i);
    assert.match(GUEST_QR_SUBMITTED_MESSAGE, /Thank you/i);
  });
});
