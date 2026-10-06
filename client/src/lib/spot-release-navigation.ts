import { MEMBER_DASHBOARD_URL } from "@/lib/member-landing";

export const SPOT_RELEASED_SESSION_KEY = "awy_spot_released";

/** After voluntarily releasing a checkout hold, land on the member dashboard hub. */
export function navigateToDashboardAfterSpotRelease(
  setLocation: (path: string) => void,
): void {
  try {
    sessionStorage.setItem(SPOT_RELEASED_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  setLocation(MEMBER_DASHBOARD_URL);
}

export function consumeSpotReleasedFlag(): boolean {
  try {
    if (sessionStorage.getItem(SPOT_RELEASED_SESSION_KEY) !== "1") return false;
    sessionStorage.removeItem(SPOT_RELEASED_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
