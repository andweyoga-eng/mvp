import {
  getPendingBooking,
  type BookingIntent,
} from "@/lib/pending-booking";
import { MY_SESSIONS_UPCOMING_URL, myAccountHref } from "@/lib/account-routes";
import type { User } from "@/lib/auth";
import { getFirstIncompleteAccountAnchor } from "@shared/profileCompleteness";

export { MY_SESSIONS_UPCOMING_URL };
export const CLASS_SCHEDULE_URL = "/?openBooking=true";

/** After sign-in, members land on the Dashboard (Sessions) home. */
export const MEMBER_DASHBOARD_URL = "/dashboard";

export const MY_ACCOUNT_PROFILE_URL = "/my-account#profile";

const LANDING_CHECKED_KEY = "awy_member_landing_checked_v1";

export function clearMemberLandingCheck(): void {
  try {
    sessionStorage.removeItem(LANDING_CHECKED_KEY);
  } catch {
    /* ignore */
  }
}

export function markMemberLandingChecked(): void {
  try {
    sessionStorage.setItem(LANDING_CHECKED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export type ReserveCheckoutSource = "home" | "login" | "profile";

/** Build the member Reserve checkout URL for a session or class-type intent. */
export function reserveHrefFromIntent(
  intent: BookingIntent,
  from: ReserveCheckoutSource = "login",
): string | null {
  if (intent.sessionId) {
    return `/reserve?sessionId=${encodeURIComponent(intent.sessionId)}&from=${from}`;
  }
  if (intent.classTypeId) {
    return `/reserve?classTypeId=${encodeURIComponent(intent.classTypeId)}&from=${from}`;
  }
  return null;
}

/** Full navigation so dashboard sees fresh profile completion from the server. */
export function redirectToMemberDashboardAfterProfileComplete(): void {
  markMemberLandingChecked();
  window.location.assign(MEMBER_DASHBOARD_URL);
}

/**
 * After onboarding, resume an in-progress booking on Reserve when intent was saved;
 * otherwise land on the member dashboard.
 */
export function redirectAfterProfileComplete(): void {
  markMemberLandingChecked();
  const reserveHref = reserveHrefFromIntent(getPendingBooking() ?? {}, "profile");
  if (reserveHref) {
    window.location.assign(reserveHref);
    return;
  }
  window.location.assign(MEMBER_DASHBOARD_URL);
}

export function hasMemberLandingBeenChecked(): boolean {
  try {
    return sessionStorage.getItem(LANDING_CHECKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function parseMyAccountTabFromSearch(search: string): {
  tab?: string;
  sessionsTab?: string;
} {
  const params = new URLSearchParams(search);
  return {
    tab: params.get("tab") ?? undefined,
    sessionsTab: params.get("sessionsTab") ?? undefined,
  };
}

/** After sign-in, incomplete members finish setup on My Account; complete members use the dashboard. */
export function resolveMemberLandingPath(
  user?: Pick<
    User,
    | "profileCompletionStatus"
    | "emailVerified"
    | "name"
    | "primaryMobile"
    | "primaryMobileCountryCode"
    | "emergencyMobile"
    | "emergencyMobileCountryCode"
    | "healthUpdateText"
  > | null,
  options?: { requiresConsent?: boolean },
): string {
  const anchor = getFirstIncompleteAccountAnchor(
    {
      emailVerified: Boolean(user?.emailVerified),
      name: user?.name,
      primaryMobile: user?.primaryMobile,
      primaryMobileCountryCode: user?.primaryMobileCountryCode,
      emergencyMobile: user?.emergencyMobile,
      emergencyMobileCountryCode: user?.emergencyMobileCountryCode,
      healthUpdateText: user?.healthUpdateText,
    },
    { requiresConsent: options?.requiresConsent },
  );
  if (anchor) {
    return myAccountHref(anchor);
  }
  if (user?.profileCompletionStatus === "incomplete") {
    return MY_ACCOUNT_PROFILE_URL;
  }
  return MEMBER_DASHBOARD_URL;
}

/** Routes that represent "just signed in" and may be auto-redirected once. */
const POST_LOGIN_LANDING_PATHS = new Set(["/", "/dashboard", "/my-account"]);

/**
 * Redirect once per browser session after login. A pending session/class booking
 * resumes on the Reserve page when the profile is complete; otherwise onboarding
 * runs first while intent stays in sessionStorage for checkout afterward.
 * Guest-modal-only intents (no ids) on Home are left for the Home page to resume.
 */
export async function applyPostLoginLandingIfNeeded(
  pathname: string,
  setLocation: (path: string) => void,
  user?: Parameters<typeof resolveMemberLandingPath>[0],
): Promise<void> {
  if (!POST_LOGIN_LANDING_PATHS.has(pathname)) return;
  if (hasMemberLandingBeenChecked()) return;

  const pending = getPendingBooking();
  const reserveHref = pending ? reserveHrefFromIntent(pending, "login") : null;

  // A modal-only intent (scrollTo, no ids) is resumed inline by the Home page.
  if (pending && !reserveHref && pathname === "/") return;

  if (pathname === "/") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mood") || params.get("classId")) return;
  }

  markMemberLandingChecked();

  if (reserveHref) {
    if (user?.profileCompletionStatus === "complete") {
      setLocation(reserveHref);
      return;
    }
    const onboarding = resolveMemberLandingPath(user);
    if (onboarding !== pathname) {
      setLocation(onboarding);
    }
    return;
  }

  const target = resolveMemberLandingPath(user);
  if (target !== pathname) {
    setLocation(target);
  }
}
