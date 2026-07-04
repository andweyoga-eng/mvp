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

export function getIncompleteAccountHref(user: User | null | undefined): string | null {
  if (!user || user.profileCompletionStatus === "complete") return null;
  const anchor = getFirstIncompleteAccountAnchor(profileCheckFromUser(user));
  return anchor ? myAccountHref(anchor) : null;
}
