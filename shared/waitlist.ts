/** Marketing classification for waitlist sign-ups (admin exports / campaigns). */
export const WAITLIST_SOURCE_REGULAR = "WL-R" as const;
export const WAITLIST_SOURCE_GUEST = "WL-G" as const;

export type WaitlistMarketingSource =
  | typeof WAITLIST_SOURCE_REGULAR
  | typeof WAITLIST_SOURCE_GUEST;

const LEGACY_MEMBER_SOURCES = new Set(["member", "regular"]);
const LEGACY_GUEST_SOURCES = new Set(["guest", "public"]);

export function resolveWaitlistMarketingSource(
  source: string | null | undefined,
  userId?: string | null,
): WaitlistMarketingSource {
  const normalized = (source ?? "").trim();
  if (normalized === WAITLIST_SOURCE_REGULAR || LEGACY_MEMBER_SOURCES.has(normalized)) {
    return WAITLIST_SOURCE_REGULAR;
  }
  if (normalized === WAITLIST_SOURCE_GUEST || LEGACY_GUEST_SOURCES.has(normalized)) {
    return WAITLIST_SOURCE_GUEST;
  }
  return userId ? WAITLIST_SOURCE_REGULAR : WAITLIST_SOURCE_GUEST;
}

export function waitlistMarketingLabel(source: string | null | undefined, userId?: string | null): string {
  return resolveWaitlistMarketingSource(source, userId);
}

export function formatProfileWhatsapp(user: {
  primaryMobile?: string | null;
  primaryMobileCountryCode?: string | null;
}): string | null {
  const mobile = user.primaryMobile?.trim();
  if (!mobile) return null;
  const countryCode = (user.primaryMobileCountryCode ?? "+91").trim();
  return `${countryCode} ${mobile}`;
}
