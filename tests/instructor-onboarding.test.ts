import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adminCreateInstructorSchema } from "../shared/admin-validation";
import {
  canInstructorTakeSessions,
  computeInstructorOperationalStatus,
  isInstructorPublicVisible,
  isInstructorSessionPoolEligible,
  isLicenseStatusBlocked,
} from "../shared/instructor-compliance";
import type { Instructor } from "../shared/schema";

function baseInstructor(overrides: Partial<Instructor> = {}): Instructor {
  return {
    id: "1",
    name: "Test",
    bio: null,
    imageUrl: null,
    specialties: null,
    email: "test@example.com",
    phone: "+919999999999",
    emailVerified: true,
    verificationMethod: "otp-verified",
    phoneVerified: true,
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    emailVerificationToken: null,
    onboardingQrImageUrl: "data:image/png;base64,abc",
    status: "active",
    statusNotes: null,
    ycbRegistrationNumber: "YCB-1",
    ycbLicenseStatus: "verified",
    ycbAdminComment: null,
    yogaAllianceRegistrationNumber: "YA-1",
    yogaAllianceLicenseStatus: "verified",
    yogaAllianceAdminComment: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("adminCreateInstructorSchema", () => {
  it("requires email, phone, onboarding QR, and license numbers", () => {
    const result = adminCreateInstructorSchema.safeParse({
      name: "Arjun",
      email: "arjun@example.com",
      phone: "9876543210",
      onboardingQrImageUrl: "data:image/jpeg;base64,/9j/4AAQ",
      ycbRegistrationNumber: "YCB-123",
      ycbLicenseStatus: "pending",
      yogaAllianceRegistrationNumber: "RYT-456",
      yogaAllianceLicenseStatus: "pending",
    });
    assert.equal(result.success, true);
  });

  it("rejects missing onboarding QR", () => {
    const result = adminCreateInstructorSchema.safeParse({
      name: "Arjun",
      email: "arjun@example.com",
      phone: "9876543210",
      ycbRegistrationNumber: "YCB-123",
      yogaAllianceRegistrationNumber: "RYT-456",
    });
    assert.equal(result.success, false);
  });
});

describe("instructor compliance", () => {
  it("blocks public visibility when suspended", () => {
    const ins = baseInstructor({ status: "suspended" });
    assert.equal(isInstructorPublicVisible(ins), false);
  });

  it("blocks sessions when license is blacklisted", () => {
    const ins = baseInstructor({ ycbLicenseStatus: "blacklisted_by_awy" });
    assert.equal(canInstructorTakeSessions(ins), false);
    assert.equal(isLicenseStatusBlocked("suspended_by_awy"), true);
  });

  it("allows active verified instructors", () => {
    const ins = baseInstructor();
    assert.equal(isInstructorPublicVisible(ins), true);
    assert.equal(canInstructorTakeSessions(ins), true);
    assert.equal(isInstructorSessionPoolEligible(ins), true);
  });

  it("computeInstructorOperationalStatus → active when fully verified", () => {
    const ins = baseInstructor();
    const r = computeInstructorOperationalStatus(ins);
    assert.equal(r.status, "active");
    assert.equal(r.statusNotes, null);
    assert.equal(isInstructorSessionPoolEligible({ ...ins, status: r.status }), true);
  });

  it("stays pending when licenses not both verified", () => {
    const ins = baseInstructor({
      status: "active",
      ycbLicenseStatus: "pending",
      yogaAllianceLicenseStatus: "verified",
    });
    const r = computeInstructorOperationalStatus(ins);
    assert.equal(r.status, "pending");
    assert.match(r.statusNotes ?? "", /YCB/i);
  });

  it("maps license blacklist to operational blacklisted", () => {
    const ins = baseInstructor({
      ycbLicenseStatus: "blacklisted_by_awy",
      yogaAllianceLicenseStatus: "verified",
    });
    const r = computeInstructorOperationalStatus(ins);
    assert.equal(r.status, "blacklisted");
  });

  it("pending onboarding stays pending until email and phone verified", () => {
    const ins = baseInstructor({
      status: "active",
      emailVerified: false,
    });
    const r = computeInstructorOperationalStatus(ins);
    assert.equal(r.status, "pending");
    assert.match(r.statusNotes ?? "", /email/i);
    assert.equal(isInstructorSessionPoolEligible({ ...ins, status: r.status }), false);
  });
});
