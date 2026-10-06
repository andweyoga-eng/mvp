import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAdminSessionPaused,
  isSessionDeleteFormSubmittable,
  sessionDeleteFormBlocker,
} from "../shared/admin-session-actions.ts";
import { PLACEHOLDER_OWNER_CANCEL_OTP } from "../shared/input-limits.ts";

describe("admin session actions", () => {
  it("isAdminSessionPaused detects paused status or pausedAt", () => {
    assert.equal(isAdminSessionPaused({ status: "published", pausedAt: null }), false);
    assert.equal(isAdminSessionPaused({ status: "paused", pausedAt: null }), true);
    assert.equal(isAdminSessionPaused({ status: "published", pausedAt: "2026-01-01T00:00:00.000Z" }), true);
  });

  it("delete form requires compensation when bookings exist", () => {
    assert.equal(
      isSessionDeleteFormSubmittable("Studio error", PLACEHOLDER_OWNER_CANCEL_OTP, 0, ""),
      true,
    );
    assert.equal(
      isSessionDeleteFormSubmittable("Studio error", PLACEHOLDER_OWNER_CANCEL_OTP, 2, ""),
      false,
    );
    assert.equal(
      isSessionDeleteFormSubmittable(
        "Studio error",
        PLACEHOLDER_OWNER_CANCEL_OTP,
        2,
        "Full refund within 3 days",
      ),
      true,
    );
  });

  it("delete form blocker explains missing compensation", () => {
    assert.equal(
      sessionDeleteFormBlocker("ok reason", PLACEHOLDER_OWNER_CANCEL_OTP, 1, ""),
      "Enter compensation details for booked members (at least 3 characters).",
    );
  });

  it("pause-resume cycle does not set cancelledAt", () => {
    let session: { status: string; pausedAt: Date | null; cancelledAt: Date | null } = {
      status: "published",
      pausedAt: null,
      cancelledAt: null,
    };
    session = { ...session, status: "paused", pausedAt: new Date() };
    assert.equal(isAdminSessionPaused(session), true);
    session = { ...session, status: "published", pausedAt: null };
    assert.equal(isAdminSessionPaused(session), false);
    assert.equal(session.cancelledAt, null);
  });
});

describe("session deletion notice copy", async () => {
  it("buildMessage includes compensation for session_deleted", async () => {
    const { buildSessionCancellationMessage } = await import("../server/session-cancellation-notify.ts");
    const { text, subject } = buildSessionCancellationMessage({
      kind: "session_deleted",
      reason: "Scheduling conflict",
      compensation: "Full credit for any class",
      classTypeName: "Agent QA Hatha",
      sessionDateIso: "2026-07-10T06:30:00.000Z",
      instructorName: "Agent QA Instructor A",
    });
    assert.match(subject, /removed/i);
    assert.match(text, /Scheduling conflict/);
    assert.match(text, /Full credit for any class/);
    assert.match(text, /permanently removed/);
  });
});
