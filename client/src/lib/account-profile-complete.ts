import type { User } from "@/lib/auth";
import {
  getFirstIncompleteAccountAnchor,
  getFirstIncompleteBookingAnchor,
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
 * My Account section still required before browsing. Only consent pending
 * returns a href. Contact details do not block the dashboard.
 */
export function getIncompleteAccountHref(
  user: User | null | undefined,
  options?: { requiresConsent?: boolean },
): string | null {
  if (!user) return null;
  const anchor = getFirstIncompleteAccountAnchor(profileCheckFromUser(user), {
    requiresConsent: options?.requiresConsent,
  });
  return anchor ? myAccountHref(anchor) : null;
}

/** My Account section still required before checkout. */
export function getIncompleteBookingHref(
  user: User | null | undefined,
  options?: { requireHealth?: boolean },
): string | null {
  if (!user) return null;
  const anchor = getFirstIncompleteBookingAnchor(profileCheckFromUser(user), {
    requireHealth: options?.requireHealth,
  });
  return anchor ? myAccountHref(anchor) : null;
}
