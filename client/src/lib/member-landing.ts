import {
  getPendingBooking,
  clearPendingBooking,
  type BookingIntent,
} from "@/lib/pending-booking";
import { MY_SESSIONS_UPCOMING_URL } from "@/lib/account-routes";

export { MY_SESSIONS_UPCOMING_URL };
export const CLASS_SCHEDULE_URL = "/?openBooking=true";

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

/** After sign-in, members land on the Dashboard (Sessions) home. */
export const MEMBER_DASHBOARD_URL = "/dashboard";

export async function resolveMemberLandingPath(): Promise<string> {
  return MEMBER_DASHBOARD_URL;
}

/** Routes that represent "just signed in" and may be auto-redirected once. */
const POST_LOGIN_LANDING_PATHS = new Set(["/", "/dashboard"]);

/** A signed-in member with a session/class intent finishes checkout on the Reserve page. */
function reserveHrefFromIntent(intent: BookingIntent): string | null {
  if (intent.sessionId)
    return `/reserve?sessionId=${encodeURIComponent(intent.sessionId)}&from=login`;
  if (intent.classTypeId)
    return `/reserve?classTypeId=${encodeURIComponent(intent.classTypeId)}&from=login`;
  return null;
}

/**
 * Redirect once per browser session after login. A pending session/class booking
 * resumes on the Reserve page; otherwise the member lands on the Dashboard.
 * Guest-modal-only intents (no ids) on Home are left for the Home page to resume.
 */
export async function applyPostLoginLandingIfNeeded(
  pathname: string,
  setLocation: (path: string) => void,
): Promise<void> {
  if (!POST_LOGIN_LANDING_PATHS.has(pathname)) return;
  if (hasMemberLandingBeenChecked()) return;

  const pending = getPendingBooking();
  const reserveHref = pending ? reserveHrefFromIntent(pending) : null;

  // A modal-only intent (scrollTo, no ids) is resumed inline by the Home page.
  if (pending && !reserveHref && pathname === "/") return;

  if (pathname === "/") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mood") || params.get("classId")) return;
  }

  markMemberLandingChecked();

  if (reserveHref) {
    clearPendingBooking();
    setLocation(reserveHref);
    return;
  }

  const target = await resolveMemberLandingPath();
  if (target !== pathname) {
    setLocation(target);
  }
}
