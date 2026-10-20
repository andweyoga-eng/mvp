import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isClassVisibleForBooking,
  sanitizePublicClass,
} from "../server/public-class.ts";

describe("public class booking visibility", () => {
  it("published class is visible for booking", () => {
    assert.equal(
      isClassVisibleForBooking({
        status: "published",
        publishedAt: new Date(),
        pausedAt: null,
      }),
      true,
    );
  });

  it("scheduled class before publish time is hidden", () => {
    assert.equal(
      isClassVisibleForBooking({
        status: "scheduled",
        publishedAt: new Date(Date.now() + 86400000),
        pausedAt: null,
      }),
      false,
    );
  });

  it("razorpay_gateway has payment configured", () => {
    const out = sanitizePublicClass({
      id: "c1",
      classTypeId: "t1",
      instructorId: "i1",
      date: new Date(),
      maxCapacity: 10,
      currentBookings: 0,
      googleMeetLink: "https://meet.google.com/x",
      razorpayLink: null,
      paymentMethod: "razorpay_gateway",
      paymentQrCodeId: null,
      qrContactPhone: null,
      qrContactEmail: null,
      status: "published",
      publishedAt: new Date(),
      pausedAt: null,
    });
    assert.equal(out.paymentMethod, "razorpay_gateway");
    assert.equal(out.hasPaymentConfigured, true);
  });
});
