import type { User } from "@/lib/auth";
import {
  getFirstIncompleteAccountAnchor,
  isAccountProfileComplete,
  type AccountProfileCheckInput,
} from "@shared/profileCompleteness";
import { myAccountHref } from "@/lib/account-routes";

/** Saved user from auth context — same rules as server booking and DB profile_completion_status */
export function isAuthUserProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  return isAccountProfileComplete(profileCheckFromUser(user));
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
 * `#privacy` even when their contact + health details are already done.
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
