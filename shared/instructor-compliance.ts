import type { Instructor } from "./schema";

/** How instructor email was verified during onboarding. */
export const INSTRUCTOR_EMAIL_VERIFICATION_METHODS = [
  "pending",
  "otp-verified",
  "admin-override",
] as const;

export type InstructorEmailVerificationMethod =
  (typeof INSTRUCTOR_EMAIL_VERIFICATION_METHODS)[number];

export function getInstructorEmailVerificationLabel(
  method: string | null | undefined,
): string {
  switch (method) {
    case "otp-verified":
      return "OTP verified";
    case "admin-override":
      return "Manually Verified";
    case "pending":
    default:
      return "Pending";
  }
}

/** License / registration validity tracked by admin per credential. */
export const INSTRUCTOR_LICENSE_STATUSES = [
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "blacklisted_by_awy", label: "Black listed by AWY" },
  { value: "expired", label: "Expired" },
  { value: "suspended_by_awy", label: "Suspended by AWY" },
] as const;

export type InstructorLicenseStatus =
  (typeof INSTRUCTOR_LICENSE_STATUSES)[number]["value"];

/** Operational status — controls sessions and public visibility. */
export const INSTRUCTOR_OPERATIONAL_STATUSES = [
  { value: "pending", label: "Pending onboarding" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended by AWY" },
  { value: "blacklisted", label: "Blacklisted by AWY" },
  { value: "expired", label: "Expired" },
] as const;

export type InstructorOperationalStatus =
  (typeof INSTRUCTOR_OPERATIONAL_STATUSES)[number]["value"];

const BLOCKED_OPERATIONAL: InstructorOperationalStatus[] = [
  "suspended",
  "blacklisted",
  "expired",
];

const BLOCKED_LICENSE: InstructorLicenseStatus[] = [
  "blacklisted_by_awy",
  "suspended_by_awy",
  "expired",
];

export function isLicenseStatusBlocked(
  status: string | null | undefined,
): boolean {
  return BLOCKED_LICENSE.includes(status as InstructorLicenseStatus);
}

export function isInstructorOperationallyBlocked(
  status: string | null | undefined,
): boolean {
  return BLOCKED_OPERATIONAL.includes(status as InstructorOperationalStatus);
}

export function getInstructorStatusLabel(status: string | null | undefined): string {
  const found = INSTRUCTOR_OPERATIONAL_STATUSES.find((s) => s.value === status);
  return found?.label ?? status ?? "Unknown";
}

export function hasMandatoryInstructorFields(
  instructor: Pick<
    Instructor,
    | "name"
    | "email"
    | "phone"
    | "onboardingQrImageUrl"
    | "ycbRegistrationNumber"
    | "yogaAllianceRegistrationNumber"
  >,
): boolean {
  return (
    !!instructor.name?.trim() &&
    !!instructor.email?.trim() &&
    !!instructor.phone?.trim() &&
    !!instructor.onboardingQrImageUrl?.trim() &&
    !!instructor.ycbRegistrationNumber?.trim() &&
    !!instructor.yogaAllianceRegistrationNumber?.trim()
  );
}

export function areBothLicensesVerified(
  instructor: Pick<Instructor, "ycbLicenseStatus" | "yogaAllianceLicenseStatus">,
): boolean {
  return (
    instructor.ycbLicenseStatus === "verified" &&
    instructor.yogaAllianceLicenseStatus === "verified"
  );
}

/** Maps blocked license rows to operational status (null = no license block). */
export function operationalStatusFromLicenses(
  ycb: string | null | undefined,
  yogaAlliance: string | null | undefined,
): InstructorOperationalStatus | null {
  if (ycb === "blacklisted_by_awy" || yogaAlliance === "blacklisted_by_awy") {
    return "blacklisted";
  }
  if (ycb === "suspended_by_awy" || yogaAlliance === "suspended_by_awy") {
    return "suspended";
  }
  if (ycb === "expired" || yogaAlliance === "expired") {
    return "expired";
  }
  return null;
}

export type InstructorStatusResolution = {
  status: InstructorOperationalStatus;
  statusNotes: string | null;
};

/**
 * Derives operational status from licenses, mandatory fields, and verification checklist.
 * Called after every instructor profile save and verification step.
 */
export function computeInstructorOperationalStatus(
  instructor: Instructor,
): InstructorStatusResolution {
  const licenseBlock = operationalStatusFromLicenses(
    instructor.ycbLicenseStatus,
    instructor.yogaAllianceLicenseStatus,
  );
  if (licenseBlock) {
    const notes =
      licenseBlock === "blacklisted"
        ? "License blacklisted by AWY"
        : licenseBlock === "suspended"
          ? "License suspended by AWY"
          : "License expired";
    return { status: licenseBlock, statusNotes: notes };
  }

  if (!hasMandatoryInstructorFields(instructor)) {
    return {
      status: "pending",
      statusNotes: "Complete required profile, contact, QR, and registration numbers",
    };
  }

  if (!areBothLicensesVerified(instructor)) {
    const parts: string[] = [];
    if (instructor.ycbLicenseStatus !== "verified") {
      parts.push(`YCB: ${INSTRUCTOR_LICENSE_STATUSES.find((s) => s.value === instructor.ycbLicenseStatus)?.label ?? instructor.ycbLicenseStatus}`);
    }
    if (instructor.yogaAllianceLicenseStatus !== "verified") {
      parts.push(
        `Yoga Alliance: ${INSTRUCTOR_LICENSE_STATUSES.find((s) => s.value === instructor.yogaAllianceLicenseStatus)?.label ?? instructor.yogaAllianceLicenseStatus}`,
      );
    }
    return {
      status: "pending",
      statusNotes: parts.join(" · "),
    };
  }

  if (!isOnboardingChecklistComplete(instructor)) {
    const awaiting: string[] = [];
    if (!instructor.emailVerified) awaiting.push("email verification");
    if (!instructor.phoneVerified) awaiting.push("phone verification");
    if (!instructor.onboardingQrImageUrl?.trim()) awaiting.push("onboarding QR");
    return {
      status: "pending",
      statusNotes: awaiting.length ? `Awaiting ${awaiting.join(", ")}` : "Onboarding incomplete",
    };
  }

  return { status: "active", statusNotes: null };
}

export function isOnboardingChecklistComplete(
  instructor: Pick<
    Instructor,
    | "emailVerified"
    | "phoneVerified"
    | "onboardingQrImageUrl"
    | "email"
    | "phone"
  >,
): boolean {
  return (
    !!instructor.email?.trim() &&
    !!instructor.phone?.trim() &&
    !!instructor.onboardingQrImageUrl?.trim() &&
    instructor.emailVerified &&
    instructor.phoneVerified
  );
}

/** True when onboarding checklist is complete and instructor is operationally active. */
export function isInstructorFullyOnboarded(
  instructor: Pick<
    Instructor,
    | "status"
    | "email"
    | "phone"
    | "emailVerified"
    | "phoneVerified"
    | "onboardingQrImageUrl"
  >,
): boolean {
  return instructor.status === "active" && isOnboardingChecklistComplete(instructor);
}

export function showManuallyVerifiedBadge(
  instructor: Pick<Instructor, "emailVerified" | "verificationMethod">,
): boolean {
  return instructor.emailVerified && instructor.verificationMethod === "admin-override";
}

/** Shown on marketing / public instructor lists. */
export function isInstructorPublicVisible(
  instructor: Pick<
    Instructor,
    | "status"
    | "email"
    | "phone"
    | "emailVerified"
    | "phoneVerified"
    | "onboardingQrImageUrl"
  >,
): boolean {
  if (isInstructorOperationallyBlocked(instructor.status)) return false;
  if (instructor.status !== "active") return false;
  return isOnboardingChecklistComplete(instructor);
}

/**
 * May be assigned to new sessions — operational "active" only.
 * Onboarding verification (email/phone/QR) is required for public marketing lists,
 * not for the admin session scheduling pool.
 */
export function isInstructorSessionPoolEligible(
  instructor: Pick<
    Instructor,
    "status" | "ycbLicenseStatus" | "yogaAllianceLicenseStatus"
  >,
): boolean {
  if (instructor.status !== "active") return false;
  if (isLicenseStatusBlocked(instructor.ycbLicenseStatus)) return false;
  if (isLicenseStatusBlocked(instructor.yogaAllianceLicenseStatus)) return false;
  return true;
}

/** @deprecated Use isInstructorSessionPoolEligible for scheduling; kept for strict marketing checks. */
export function canInstructorTakeSessions(
  instructor: Pick<
    Instructor,
    | "status"
    | "emailVerified"
    | "phoneVerified"
    | "onboardingQrImageUrl"
    | "ycbLicenseStatus"
    | "yogaAllianceLicenseStatus"
  >,
): boolean {
  if (!isInstructorSessionPoolEligible(instructor)) return false;
  if (!isInstructorPublicVisible(instructor)) return false;
  return true;
}

export type PublicInstructorProfile = {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  specialties: string[] | null;
};

export function toPublicInstructorProfile(
  instructor: Instructor,
): PublicInstructorProfile {
  return {
    id: instructor.id,
    name: instructor.name,
    bio: instructor.bio,
    imageUrl: instructor.imageUrl,
    specialties: instructor.specialties,
  };
}
