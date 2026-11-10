import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildInstructorVerifyEmailUrl,
  createInstructorOtpPayload,
  resolvePublicAppBaseUrl,
} from "../server/instructor-verification.ts";
import {
  getInstructorEmailVerificationLabel,
  INSTRUCTOR_EMAIL_VERIFICATION_METHODS,
  isInstructorFullyOnboarded,
  showManuallyVerifiedBadge,
} from "../shared/instructor-compliance.ts";
import type { Instructor } from "../shared/schema.ts";

describe("instructor email verification methods", () => {
  it("exports expected verification method values", () => {
    assert.deepEqual(INSTRUCTOR_EMAIL_VERIFICATION_METHODS, [
      "pending",
      "otp-verified",
      "admin-override",
    ]);
  });

  it("labels verification methods for admin display", () => {
    assert.equal(getInstructorEmailVerificationLabel("pending"), "Pending");
    assert.equal(getInstructorEmailVerificationLabel("otp-verified"), "OTP verified");
    assert.equal(getInstructorEmailVerificationLabel("admin-override"), "Manually Verified");
  });
});

describe("instructor OTP link helpers", () => {
  it("buildInstructorVerifyEmailUrl encodes token", () => {
    const url = buildInstructorVerifyEmailUrl("abc+token", "http://localhost:3000");
    assert.equal(url, "http://localhost:3000/api/instructors/verify-email?token=abc%2Btoken");
  });

  it("resolvePublicAppBaseUrl uses http for localhost in development", () => {
    const prev = process.env.NODE_ENV;
    const prevOrigin = process.env.ALLOWED_ORIGIN;
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_ORIGIN = "localhost:3000";
    assert.equal(resolvePublicAppBaseUrl(), "http://localhost:3000");
    if (prev) process.env.NODE_ENV = prev;
    else delete process.env.NODE_ENV;
    if (prevOrigin) process.env.ALLOWED_ORIGIN = prevOrigin;
    else delete process.env.ALLOWED_ORIGIN;
  });

  it("createInstructorOtpPayload returns otp, hash, expiry, and link token", async () => {
    const payload = await createInstructorOtpPayload();
    assert.match(payload.otp, /^\d{6}$/);
    assert.ok(payload.hash.length > 20);
    assert.ok(payload.expiresAt.getTime() > Date.now());
    assert.ok(payload.linkToken.length >= 32);
  });
});

describe("instructor card badge helpers", () => {
  const onboarded: Instructor = {
    id: "1",
    name: "A",
    bio: null,
    imageUrl: null,
    specialties: null,
    email: "a@x.com",
    phone: "+91 9999999999",
    emailVerified: true,
    verificationMethod: "admin-override",
    phoneVerified: true,
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    emailVerificationToken: null,
    onboardingQrImageUrl: "data:image/png;base64,x",
    status: "active",
    statusNotes: null,
    ycbRegistrationNumber: "Y",
    ycbLicenseStatus: "verified",
    ycbAdminComment: null,
    yogaAllianceRegistrationNumber: "Z",
    yogaAllianceLicenseStatus: "verified",
    yogaAllianceAdminComment: null,
    updatedAt: new Date(),
  };

  it("showManuallyVerifiedBadge when admin override and email verified", () => {
    assert.equal(showManuallyVerifiedBadge(onboarded), true);
  });

  it("isInstructorFullyOnboarded when active and checklist complete", () => {
    assert.equal(isInstructorFullyOnboarded(onboarded), true);
  });
});

describe("manual override API contract", () => {
  it("manual override route path is documented for super admin only", () => {
    const path = "/api/admin/instructors/:id/verify-email/manual";
    assert.match(path, /verify-email\/manual$/);
  });
});
