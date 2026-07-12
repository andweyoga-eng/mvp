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

export function getFirstIncompleteAccountAnchor(
  u: AccountProfileCheckInput,
  options?: { requiresConsent?: boolean },
): AccountOnboardingAnchor | null {
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
  if (!isHealthDisclosureComplete(u.healthUpdateText)) {
    return "health";
  }
  if (options?.requiresConsent) {
    return "privacy";
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

export function isAccountProfileComplete(u: AccountProfileCheckInput): boolean {
  if (!u.emailVerified) return false;
  if (!(u.name ?? '').trim()) return false;
  if (!requiredMobileOk(u.primaryMobile, u.primaryMobileCountryCode)) return false;
  if (!requiredMobileOk(u.emergencyMobile, u.emergencyMobileCountryCode)) return false;
  if (!optionalSecondaryOk(u.secondaryMobile, u.secondaryMobileCountryCode)) return false;
  if (!isHealthDisclosureComplete(u.healthUpdateText)) return false;
  return true;
}

export function computeProfileCompletionStatus(
  u: AccountProfileCheckInput,
): 'complete' | 'incomplete' {
  return isAccountProfileComplete(u) ? 'complete' : 'incomplete';
}

/** Human-readable gaps for UI (e.g. booking modal). */
export function getAccountProfileIncompleteReasons(u: AccountProfileCheckInput): string[] {
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

  if (!isHealthDisclosureComplete(u.healthUpdateText)) {
    reasons.push(
      'Health disclosure required. Select an option on the Health Update tab.',
    );
  }

  return reasons;
}
