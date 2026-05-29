import { getAuthHeaders } from "@/lib/auth";
import { getPendingBooking } from "@/lib/pending-booking";

export const MY_SESSIONS_UPCOMING_URL = "/my-account?tab=sessions&sessionsTab=upcoming";
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

/** Upcoming (future) session → My Sessions; otherwise → class schedule on home. */
export async function resolveMemberLandingPath(): Promise<string> {
  try {
    const res = await fetch("/api/sessions/my", {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return CLASS_SCHEDULE_URL;
    const sessions = (await res.json()) as Array<{ status: string }>;
    const hasUpcoming = sessions.some((s) => s.status === "upcoming");
    return hasUpcoming ? MY_SESSIONS_UPCOMING_URL : CLASS_SCHEDULE_URL;
  } catch {
    return CLASS_SCHEDULE_URL;
  }
}

/** Redirect once per browser session after login when user lands on home without booking intent. */
export async function applyPostLoginLandingIfNeeded(
  pathname: string,
  setLocation: (path: string) => void,
): Promise<void> {
  if (pathname !== "/") return;
  if (hasMemberLandingBeenChecked()) return;
  if (getPendingBooking()) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("mood") || params.get("classId")) return;

  markMemberLandingChecked();
  const target = await resolveMemberLandingPath();
  if (target !== pathname) {
    setLocation(target);
  }
}
