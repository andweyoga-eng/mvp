/**
 * Auth cookie helpers shared by the email/password and Google OAuth flows.
 *
 * "Keep me signed in" controls cookie lifetime:
 *  - ON  → persistent cookie (survives browser restart) via maxAge.
 *  - OFF → session cookie (omit maxAge) the browser clears on close.
 *
 * The preference is captured at sign-in start and round-trips through the
 * Google OAuth redirect inside the short-lived `awy_oauth_keep` cookie.
 */

export const AUTH_COOKIE_NAME = "authToken";
export const OAUTH_KEEP_COOKIE_NAME = "awy_oauth_keep";

/** Persistent auth cookie lifetime: 7 days. */
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** The keep-preference cookie only needs to survive the OAuth round-trip. */
export const OAUTH_KEEP_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  maxAge?: number;
}

/**
 * Cookie options for the auth token. When `persistent` is false we omit
 * `maxAge` so the browser treats it as a session cookie.
 */
export function buildAuthCookieOptions(
  persistent: boolean,
  isProduction: boolean = process.env.NODE_ENV === "production",
): AuthCookieOptions {
  const options: AuthCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  };
  if (persistent) options.maxAge = AUTH_COOKIE_MAX_AGE_MS;
  return options;
}

/** Options for the short-lived cookie that carries the keep preference. */
export function buildOAuthKeepCookieOptions(
  isProduction: boolean = process.env.NODE_ENV === "production",
): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: OAUTH_KEEP_COOKIE_MAX_AGE_MS,
  };
}

/**
 * "Keep me signed in" defaults ON; only an explicit "0" opts out. Works for
 * the `?keep=` query param and the `awy_oauth_keep` cookie alike.
 */
export function keepSignedInFromValue(value: unknown): boolean {
  return value !== "0";
}
