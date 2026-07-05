import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSessionPaymentMethod,
  usesHostedCheckout,
  providerForSessionMethod,
  dispositionFromPaymentStatus,
  isAutomatedGatewayCapture,
  isManualVerificationMethod,
  requiresAdminVerification,
  formatGatewayPaymentStatus,
} from "../shared/payment-gateway.ts";
import { getMeetJoinState, getJoinPromptCelebrationCopy, isWithinJoinPromptWindow } from "../shared/session-meet-access.ts";

describe("payment gateway helpers", () => {
  it("normalizes legacy razorpay to link", () => {
    assert.equal(normalizeSessionPaymentMethod("razorpay"), "razorpay_link");
    assert.equal(normalizeSessionPaymentMethod("razorpay_gateway"), "razorpay_gateway");
  });

  it("detects hosted checkout only for gateway method", () => {
    assert.equal(usesHostedCheckout("razorpay_gateway"), true);
    assert.equal(usesHostedCheckout("razorpay_link"), false);
    assert.equal(usesHostedCheckout("qr"), false);
  });

  it("maps session method to provider", () => {
    assert.equal(providerForSessionMethod("razorpay_gateway"), "razorpay");
    assert.equal(providerForSessionMethod("qr"), "manual_qr");
  });

  it("maps payment status to disposition", () => {
    assert.equal(dispositionFromPaymentStatus("paid"), "received");
    assert.equal(dispositionFromPaymentStatus("failed"), "failed");
    assert.equal(dispositionFromPaymentStatus("created"), "pending");
  });

  it("classifies manual vs gateway methods", () => {
    assert.equal(isManualVerificationMethod("qr"), true);
    assert.equal(isManualVerificationMethod("razorpay_link"), true);
    assert.equal(isManualVerificationMethod("razorpay_link", "manual_link"), true);
    assert.equal(isAutomatedGatewayCapture("razorpay_gateway"), true);
    assert.equal(isAutomatedGatewayCapture("razorpay_link", "razorpay"), true);
    assert.equal(isAutomatedGatewayCapture("qr"), false);
  });

  it("detects pending manual verification", () => {
    assert.equal(
      requiresAdminVerification({
        paymentMethod: "qr",
        gatewayProvider: "manual_qr",
        status: "pending",
        adminDisposition: "pending",
        verificationStatus: "pending",
      }),
      true,
    );
    assert.equal(
      requiresAdminVerification({
        paymentMethod: "razorpay_link",
        gatewayProvider: "manual_link",
        status: "pending",
        adminDisposition: "pending",
        bookingPaymentStatus: "pending",
        verificationStatus: "pending",
      }),
      true,
    );
    assert.equal(
      requiresAdminVerification({
        paymentMethod: "razorpay_link",
        gatewayProvider: "manual_link",
        status: "pending",
        adminDisposition: "pending",
        bookingPaymentStatus: "pending",
        verificationStatus: null,
      }),
      false,
    );
    assert.equal(
      requiresAdminVerification({
        paymentMethod: "razorpay_gateway",
        gatewayProvider: "razorpay",
        status: "paid",
        adminDisposition: "received",
        bookingPaymentStatus: "paid",
      }),
      false,
    );
  });

  it("formats gateway status labels", () => {
    assert.equal(formatGatewayPaymentStatus("paid"), "Paid");
    assert.equal(formatGatewayPaymentStatus("failed"), "Failed");
  });
});

describe("meet join window", () => {
  const start = new Date("2026-06-01T10:00:00Z");

  it("hides link when not paid", () => {
    assert.equal(
      getMeetJoinState({
        sessionStart: start,
        sessionDurationMinutes: 60,
        isPaid: false,
        hasMeetLink: true,
        now: new Date("2026-06-01T09:30:00Z"),
      }),
      "hidden",
    );
  });

  it("disables link more than 1 hour before start", () => {
    assert.equal(
      getMeetJoinState({
        sessionStart: start,
        sessionDurationMinutes: 60,
        isPaid: true,
        hasMeetLink: true,
        now: new Date("2026-06-01T08:00:00Z"),
      }),
      "disabled",
    );
  });

  it("activates within window", () => {
    assert.equal(
      getMeetJoinState({
        sessionStart: start,
        sessionDurationMinutes: 60,
        isPaid: true,
        hasMeetLink: true,
        now: new Date("2026-06-01T09:30:00Z"),
      }),
      "active",
    );
  });

  it("disables after session end", () => {
    assert.equal(
      getMeetJoinState({
        sessionStart: start,
        sessionDurationMinutes: 60,
        isPaid: true,
        hasMeetLink: true,
        now: new Date("2026-06-01T11:30:00Z"),
      }),
      "disabled",
    );
  });
});

describe("join prompt window", () => {
  const start = new Date("2026-06-01T10:00:00Z");

  it("is closed more than 30 minutes before start", () => {
    assert.equal(
      isWithinJoinPromptWindow({
        sessionStart: start,
        sessionDurationMinutes: 60,
        now: new Date("2026-06-01T09:00:00Z"),
      }),
      false,
    );
  });

  it("opens 30 minutes before start", () => {
    assert.equal(
      isWithinJoinPromptWindow({
        sessionStart: start,
        sessionDurationMinutes: 60,
        now: new Date("2026-06-01T09:30:00Z"),
      }),
      true,
    );
  });

  it("stays open during the session", () => {
    assert.equal(
      isWithinJoinPromptWindow({
        sessionStart: start,
        sessionDurationMinutes: 60,
        now: new Date("2026-06-01T10:15:00Z"),
      }),
      true,
    );
  });

  it("closes after session end", () => {
    assert.equal(
      isWithinJoinPromptWindow({
        sessionStart: start,
        sessionDurationMinutes: 60,
        now: new Date("2026-06-01T11:30:00Z"),
      }),
      false,
    );
  });
});

describe("join prompt celebration copy", () => {
  const start = new Date("2026-07-06T02:15:00+05:30");
  const base = {
    className: "weRun weLift and WeYoga",
    instructorName: "Deepti Kukreja",
    sessionStart: start,
    sessionDurationMinutes: 60,
  };

  it("uses soon copy before class", () => {
    const copy = getJoinPromptCelebrationCopy({
      ...base,
      now: new Date("2026-07-06T01:50:00+05:30"),
    });
    assert.equal(copy.title, "Class is starting soon");
    assert.match(copy.description, /begins in about 25 minutes/);
    assert.equal(copy.primaryCta, "Hop on Meet");
  });

  it("uses live copy during class", () => {
    const copy = getJoinPromptCelebrationCopy({
      ...base,
      now: new Date("2026-07-06T02:18:00+05:30"),
    });
    assert.equal(copy.title, "We are live");
    assert.match(copy.description, /in flow right now/);
    assert.match(copy.description, /Deepti Kukreja/);
    assert.equal(copy.primaryCta, "Join now");
  });

  it("uses ending copy in the final stretch", () => {
    const copy = getJoinPromptCelebrationCopy({
      ...base,
      now: new Date("2026-07-06T03:05:00+05:30"),
    });
    assert.equal(copy.title, "Still time to join");
    assert.match(copy.description, /wrapping up soon/);
    assert.equal(copy.primaryCta, "Hop in now");
  });
});
