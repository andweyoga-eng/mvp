import { validateMobileNumber } from '@shared/mobile-validation';
import {
  isHealthDisclosureComplete,
  MAX_HEALTH_CONCERNS_CHARS,
} from '@shared/health-disclosure';

/** @deprecated Prefer MAX_HEALTH_CONCERNS_CHARS / isHealthDisclosureComplete */
export const MIN_HEALTH_UPDATE_CHARS = MAX_HEALTH_CONCERNS_CHARS;

export { MAX_HEALTH_CONCERNS_CHARS, isHealthDisclosureComplete };

export type AccountProfileCheckInput = {
  emailVerified: boolean;
  name: string | null | undefined;
  primaryMobile: string | null | undefined;
  primaryMobileCountryCode: string | null | undefined;
  secondaryMobile?: string | null | undefined;
  secondaryMobileCountryCode?: string | null | undefined;
  emergencyMobile: string | null | undefined;
  emergencyMobileCountryCode: string | null | undefined;
  healthUpdateText?: string | null | undefined;
};

function cc(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  return v || '+91';
}

function requiredMobileOk(
  mobile: string | null | undefined,
  countryCode: string | null | undefined,
): boolean {
  const digits = (mobile ?? '').trim();
  if (!digits) return false;
  return validateMobileNumber(digits, cc(countryCode)).isValid;
}

function optionalSecondaryOk(
  mobile: string | null | undefined,
  countryCode: string | null | undefined,
): boolean {
  const digits = (mobile ?? '').trim();
  if (!digits) return true;
  return validateMobileNumber(digits, cc(countryCode)).isValid;
}

export type AccountOnboardingAnchor = "profile" | "health" | "privacy";

export type MemberReadiness = "none" | "account" | "bookable" | "practice_ready";

/**
 * L1 Account through L3 Practice ready.
 * `requiresConsent` means the consent gate is still open (date of birth and the
 * three consents are not done). `healthConsentActive` false keeps a member at
 * bookable even when Health History text is saved.
 */
export function getMemberReadiness(
  u: AccountProfileCheckInput,
  options?: { requiresConsent?: boolean; healthConsentActive?: boolean },
): MemberReadiness {
  const identityOk = Boolean(u.emailVerified) && Boolean((u.name ?? "").trim());
  if (!identityOk || options?.requiresConsent) return "none";
  if (!isAccountProfileComplete(u)) return "account";
  const practiceReady =
    isHealthSectionComplete(u) && options?.healthConsentActive !== false;
  return practiceReady ? "practice_ready" : "bookable";
}

/**
 * Contact and Health History still required before a booking. Consent is not
 * part of this anchor — browsing uses getFirstIncompleteAccountAnchor.
 */
export function getFirstIncompleteBookingAnchor(
  u: AccountProfileCheckInput,
  options?: { requireHealth?: boolean },
): "profile" | "health" | null {
  if (!u.emailVerified) return "profile";
  if (!(u.name ?? "").trim()) return "profile";
  if (!requiredMobileOk(u.primaryMobile, u.primaryMobileCountryCode)) {
    return "profile";
  }
  if (!requiredMobileOk(u.emergencyMobile, u.emergencyMobileCountryCode)) {
    return "profile";
  }
  if (!optionalSecondaryOk(u.secondaryMobile, u.secondaryMobileCountryCode)) {
    return "profile";
  }
  if (options?.requireHealth && !isHealthDisclosureComplete(u.healthUpdateText)) {
    return "health";
  }
  return null;
}

/**
 * Browsing gate. Consent pending sends the member to Privacy. Name, mobile,
 * and emergency contact no longer block the dashboard.
 * `requireHealth` is ignored — paid-session health lives on the booking anchor.
 */
export function getFirstIncompleteAccountAnchor(
  _u: AccountProfileCheckInput,
  options?: { requiresConsent?: boolean; requireHealth?: boolean },
): AccountOnboardingAnchor | null {
  void options?.requireHealth;
  if (options?.requiresConsent) return "privacy";
  return null;
}

const CONTACT_INCOMPLETE_MESSAGE =
  "Your profile is incomplete. Add your name, verified email, and primary and emergency mobiles in My Account before booking.";

const HEALTH_INCOMPLETE_MESSAGE =
  "Share a short Health History so instructors can adapt your practice safely, then continue booking.";

export type SignedInBookingProfileBlock = {
  message: string;
  requiresHealthUpdate: boolean;
  redirectTo: string;
  code: "profile_incomplete";
};

/**
 * Server booking gate. Contact (L2) applies to every signed-in session type.
 * Health History applies only when the session cannot be booked as a guest
 * (`mustBeSignedIn`), which is paid / recurring.
 */
export function signedInBookingProfileBlock(
  user: AccountProfileCheckInput,
  options: { mustBeSignedIn: boolean },
): SignedInBookingProfileBlock | null {
  if (!isAccountProfileComplete(user)) {
    return {
      message: CONTACT_INCOMPLETE_MESSAGE,
      requiresHealthUpdate: false,
      redirectTo: "/my-account#profile",
      code: "profile_incomplete",
    };
  }
  if (options.mustBeSignedIn && !isReadyForPaidHealthBooking(user)) {
    return {
      message: HEALTH_INCOMPLETE_MESSAGE,
      requiresHealthUpdate: true,
      redirectTo: "/my-account#health",
      code: "profile_incomplete",
    };
  }
  return null;
}

/** Profile tab fields only (name, phones, email verified) — excludes health disclosure. */
export function isProfileFieldsSectionComplete(u: AccountProfileCheckInput): boolean {
  if (!u.emailVerified) return false;
  if (!(u.name ?? '').trim()) return false;
  if (!requiredMobileOk(u.primaryMobile, u.primaryMobileCountryCode)) return false;
  if (!requiredMobileOk(u.emergencyMobile, u.emergencyMobileCountryCode)) return false;
  if (!optionalSecondaryOk(u.secondaryMobile, u.secondaryMobileCountryCode)) return false;
  return true;
}

/** Health disclosure section only. */
export function isHealthSectionComplete(u: AccountProfileCheckInput): boolean {
  return isHealthDisclosureComplete(u.healthUpdateText);
}

/**
 * Contact onboarding complete (email, name, mobiles). Health is intentional and
 * separate — required for paid health sessions, not for finishing setup.
 */
export function isAccountProfileComplete(u: AccountProfileCheckInput): boolean {
  return isProfileFieldsSectionComplete(u);
}

/** Paid / recurring health sessions need contact + Health History. */
export function isReadyForPaidHealthBooking(u: AccountProfileCheckInput): boolean {
  return isProfileFieldsSectionComplete(u) && isHealthSectionComplete(u);
}

export function computeProfileCompletionStatus(
  u: AccountProfileCheckInput,
): 'complete' | 'incomplete' {
  return isAccountProfileComplete(u) ? 'complete' : 'incomplete';
}

/** Human-readable gaps for UI (e.g. booking modal). */
export function getAccountProfileIncompleteReasons(
  u: AccountProfileCheckInput,
  options?: { requireHealth?: boolean },
): string[] {
  const reasons: string[] = [];
  if (!u.emailVerified) reasons.push('Email not verified');
  if (!(u.name ?? '').trim()) reasons.push('Full name is required');

  const primaryDigits = (u.primaryMobile ?? '').trim();
  if (!primaryDigits) {
    reasons.push('Mobile number is required');
  } else {
    const pr = validateMobileNumber(primaryDigits, cc(u.primaryMobileCountryCode));
    if (!pr.isValid) reasons.push(`Primary mobile: ${pr.error ?? 'invalid'}`);
  }

  const emergencyDigits = (u.emergencyMobile ?? '').trim();
  if (!emergencyDigits) {
    reasons.push('Emergency contact is required');
  } else {
    const er = validateMobileNumber(emergencyDigits, cc(u.emergencyMobileCountryCode));
    if (!er.isValid) reasons.push(`Emergency mobile: ${er.error ?? 'invalid'}`);
  }

  const sec = (u.secondaryMobile ?? '').trim();
  if (sec) {
    const sr = validateMobileNumber(sec, cc(u.secondaryMobileCountryCode));
    if (!sr.isValid) reasons.push(`Secondary mobile: ${sr.error ?? 'invalid'}`);
  }

  if (options?.requireHealth !== false && !isHealthDisclosureComplete(u.healthUpdateText)) {
    reasons.push(
      'Health History required. Add your latest update on the Health History tab.',
    );
  }

  return reasons;
}
