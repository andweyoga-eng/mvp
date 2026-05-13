import { validateMobileNumber } from '@shared/mobile-validation';

/** Matches healthUpdateSchema and booking rules */
export const MIN_HEALTH_UPDATE_CHARS = 10;

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

export function isAccountProfileComplete(u: AccountProfileCheckInput): boolean {
  if (!u.emailVerified) return false;
  if (!(u.name ?? '').trim()) return false;
  if (!requiredMobileOk(u.primaryMobile, u.primaryMobileCountryCode)) return false;
  if (!requiredMobileOk(u.emergencyMobile, u.emergencyMobileCountryCode)) return false;
  if (!optionalSecondaryOk(u.secondaryMobile, u.secondaryMobileCountryCode)) return false;
  const h = (u.healthUpdateText ?? '').trim();
  if (h.length < MIN_HEALTH_UPDATE_CHARS) return false;
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
    reasons.push('Primary mobile is required');
  } else {
    const pr = validateMobileNumber(primaryDigits, cc(u.primaryMobileCountryCode));
    if (!pr.isValid) reasons.push(`Primary mobile: ${pr.error ?? 'invalid'}`);
  }

  const emergencyDigits = (u.emergencyMobile ?? '').trim();
  if (!emergencyDigits) {
    reasons.push('Emergency contact mobile is required');
  } else {
    const er = validateMobileNumber(emergencyDigits, cc(u.emergencyMobileCountryCode));
    if (!er.isValid) reasons.push(`Emergency mobile: ${er.error ?? 'invalid'}`);
  }

  const sec = (u.secondaryMobile ?? '').trim();
  if (sec) {
    const sr = validateMobileNumber(sec, cc(u.secondaryMobileCountryCode));
    if (!sr.isValid) reasons.push(`Secondary mobile: ${sr.error ?? 'invalid'}`);
  }

  const h = (u.healthUpdateText ?? '').trim();
  if (h.length < MIN_HEALTH_UPDATE_CHARS) {
    reasons.push(
      `Health update required (at least ${MIN_HEALTH_UPDATE_CHARS} characters)`,
    );
  }

  return reasons;
}
