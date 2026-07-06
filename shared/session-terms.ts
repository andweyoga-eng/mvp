/** Default session-type terms shown in admin and at checkout when none are set. */
export const DEFAULT_SESSION_TERMS_AND_CONDITIONS =
  "The sessions are non-refundable. If there is a no-show by the instructor, an alternative session will be arranged to compensate for the session. You can also choose to convert that session into credits, which you can use for any other bookings on the platform.";

export const SESSION_TERMS_MAX_LENGTH = 5000;

/** Resolve display text for checkout — falls back to platform default. */
export function resolveSessionTermsAndConditions(
  value: string | null | undefined,
): string {
  const trimmed = (value ?? "").trim();
  return trimmed || DEFAULT_SESSION_TERMS_AND_CONDITIONS;
}
