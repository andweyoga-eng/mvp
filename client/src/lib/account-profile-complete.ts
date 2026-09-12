import type { User } from "@/lib/auth";
import {
  getFirstIncompleteAccountAnchor,
  isAccountProfileComplete,
  isReadyForPaidHealthBooking,
  type AccountProfileCheckInput,
} from "@shared/profileCompleteness";
import { myAccountHref } from "@/lib/account-routes";

/** Saved user from auth context — contact onboarding (excludes Health History). */
export function isAuthUserProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  return isAccountProfileComplete(profileCheckFromUser(user));
}

/** Contact + Health History — required before paying for a health session. */
export function isAuthUserReadyForPaidHealthBooking(user: User | null | undefined): boolean {
  if (!user) return false;
  return isReadyForPaidHealthBooking(profileCheckFromUser(user));
}

export function profileCheckFromUser(user: User): AccountProfileCheckInput {
  return {
    emailVerified: user.emailVerified,
    name: user.name,
    primaryMobile: user.primaryMobile,
    primaryMobileCountryCode: user.primaryMobileCountryCode,
    secondaryMobile: user.secondaryMobile,
    secondaryMobileCountryCode: user.secondaryMobileCountryCode,
    emergencyMobile: user.emergencyMobile,
    emergencyMobileCountryCode: user.emergencyMobileCountryCode,
    healthUpdateText: user.healthUpdateText,
  };
}

/**
 * The My Account section a member must still complete before they can browse.
 * Consent is a first-class gate: pass `requiresConsent` to route them to
 * `#privacy` even when their contact details are already done.
 * Pass `requireHealth` when gating a paid health session checkout.
 */
export function getIncompleteAccountHref(
  user: User | null | undefined,
  options?: { requiresConsent?: boolean; requireHealth?: boolean },
): string | null {
  if (!user) return null;
  const anchor = getFirstIncompleteAccountAnchor(profileCheckFromUser(user), {
    requiresConsent: options?.requiresConsent,
    requireHealth: options?.requireHealth,
  });
  return anchor ? myAccountHref(anchor) : null;
}
