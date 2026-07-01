/**
 * The account experience is a single-scroll page at `/my-account` whose six
 * sections are reached via in-page anchors. Every drawer/link across the app
 * deep-links into these anchors; legacy `/account/*` routes redirect here.
 */
export const MY_ACCOUNT_URL = "/my-account";

export const ACCOUNT_ANCHORS = {
  profile: "profile",
  health: "health",
  sessions: "sessions",
  payments: "payments",
  preferences: "preferences",
  security: "security",
  privacy: "privacy",
} as const;

export type AccountAnchor = keyof typeof ACCOUNT_ANCHORS;

/** Build a deep-link into the single account page, e.g. `/my-account#health`. */
export function myAccountHref(anchor?: AccountAnchor): string {
  return anchor ? `${MY_ACCOUNT_URL}#${anchor}` : MY_ACCOUNT_URL;
}

/** Sessions deep-link used across the app (drawer, post-booking redirects). */
export const MY_SESSIONS_UPCOMING_URL = myAccountHref("sessions");

/**
 * Map any legacy account URL — `/account`, `/account/profile`, …, or a legacy
 * `/my-account?tab=…` — to the new single-page anchor it should resume at.
 */
export function mapLegacyAccountUrl(pathname: string, search: string): string {
  const tab = new URLSearchParams(search).get("tab");

  if (pathname === "/account/profile" || tab === "profile") return myAccountHref("profile");
  if (pathname === "/account/health" || tab === "health") return myAccountHref("health");
  if (pathname === "/account/payments" ||
    pathname === "/account/subscriptions" ||
    tab === "payments" ||
    tab === "subscriptions"
  ) {
    return myAccountHref("payments");
  }
  if (pathname === "/account/privacy" || tab === "privacy") return myAccountHref("privacy");
  // `/account`, `/account?sessionsTab=…`, or `?tab=sessions` → Sessions section.
  return myAccountHref("sessions");
}

/** Resolve the anchor a legacy `?tab=` query maps to (used by the page itself). */
export function anchorFromLegacyTab(tab: string | null | undefined): AccountAnchor | null {
  switch (tab) {
    case "profile":
      return "profile";
    case "health":
      return "health";
    case "payments":
    case "subscriptions":
      return "payments";
    case "sessions":
      return "sessions";
    case "privacy":
      return "privacy";
    default:
      return null;
  }
}
