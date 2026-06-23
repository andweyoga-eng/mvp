export const ACCOUNT_ROUTES = {
  sessions: "/account",
  profile: "/account/profile",
  health: "/account/health",
  subscriptions: "/account/subscriptions",
  payments: "/account/payments",
} as const;

export type AccountSection = keyof typeof ACCOUNT_ROUTES;

export const ACCOUNT_SECTION_TITLES: Record<AccountSection, string> = {
  sessions: "My Sessions",
  profile: "My Profile",
  health: "Health Update",
  subscriptions: "My Subscriptions",
  payments: "Payment History",
};

export const MY_SESSIONS_UPCOMING_URL = "/account?sessionsTab=upcoming";

/** Map legacy `/my-account?tab=…` URLs to new `/account/…` routes. */
export function mapLegacyMyAccountUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  params.delete("tab");

  let base = ACCOUNT_ROUTES.sessions;
  if (tab === "profile") base = ACCOUNT_ROUTES.profile;
  else if (tab === "health") base = ACCOUNT_ROUTES.health;
  else if (tab === "subscriptions") base = ACCOUNT_ROUTES.subscriptions;
  else if (tab === "payments") base = ACCOUNT_ROUTES.payments;

  if (!tab || tab === "sessions") {
    const sessionsTab = params.get("sessionsTab");
    params.delete("sessionsTab");
    if (sessionsTab) params.set("sessionsTab", sessionsTab);
  } else {
    params.delete("sessionsTab");
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getAccountSectionFromPath(pathname: string): AccountSection {
  if (pathname === ACCOUNT_ROUTES.profile) return "profile";
  if (pathname === ACCOUNT_ROUTES.health) return "health";
  if (pathname === ACCOUNT_ROUTES.subscriptions) return "subscriptions";
  if (pathname === ACCOUNT_ROUTES.payments) return "payments";
  return "sessions";
}

export function parseAccountSessionsTab(search: string): string | undefined {
  return new URLSearchParams(search).get("sessionsTab") ?? undefined;
}
