import type { User } from "@/lib/auth";
import { isAccountProfileComplete } from "@shared/profileCompleteness";

/** Saved user from auth context — same rules as server booking and DB profile_completion_status */
export function isAuthUserProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  return isAccountProfileComplete({
    emailVerified: user.emailVerified,
    name: user.name,
    primaryMobile: user.primaryMobile,
    primaryMobileCountryCode: user.primaryMobileCountryCode,
    secondaryMobile: user.secondaryMobile,
    secondaryMobileCountryCode: user.secondaryMobileCountryCode,
    emergencyMobile: user.emergencyMobile,
    emergencyMobileCountryCode: user.emergencyMobileCountryCode,
    healthUpdateText: user.healthUpdateText,
  });
}
