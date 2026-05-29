import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deliverInstructorEmailOtp } from "../server/instructor-verification.ts";
import type { Instructor } from "../shared/schema.ts";

describe("deliverInstructorEmailOtp", () => {
  const instructor: Instructor = {
    id: "1",
    name: "Test",
    bio: null,
    imageUrl: null,
    specialties: null,
    email: "instructor@example.com",
    phone: "+919999999999",
    emailVerified: false,
    phoneVerified: false,
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    onboardingQrImageUrl: null,
    status: "pending",
    statusNotes: null,
    ycbRegistrationNumber: "YCB",
    ycbLicenseStatus: "pending",
    ycbAdminComment: null,
    yogaAllianceRegistrationNumber: "YA",
    yogaAllianceLicenseStatus: "pending",
    yogaAllianceAdminComment: null,
    updatedAt: new Date(),
  };

  it("returns error when Gmail is not configured", async () => {
    const prevUser = process.env.GMAIL_USER;
    const prevPass = process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;

    const result = await deliverInstructorEmailOtp(instructor, "123456");
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /GMAIL_USER/i);

    if (prevUser) process.env.GMAIL_USER = prevUser;
    if (prevPass) process.env.GMAIL_APP_PASSWORD = prevPass;
  });

  it("returns error when instructor has no email", async () => {
    const result = await deliverInstructorEmailOtp({ ...instructor, email: null }, "123456");
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /no email/i);
  });
});
