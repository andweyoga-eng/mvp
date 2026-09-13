/** Default session length when class type duration is missing (minutes). */
export const DEFAULT_SESSION_DURATION_MINUTES = 60;

export function resolveSessionDurationMinutes(
  durationMinutes: number | null | undefined,
): number {
  return typeof durationMinutes === "number" && durationMinutes > 0
    ? durationMinutes
    : DEFAULT_SESSION_DURATION_MINUTES;
}

export function getSessionEndTime(
  start: Date | string,
  durationMinutes: number = DEFAULT_SESSION_DURATION_MINUTES,
): Date {
  const startMs = new Date(start).getTime();
  const mins = resolveSessionDurationMinutes(durationMinutes);
  return new Date(startMs + mins * 60_000);
}

/** True while the session window has not ended (start + duration is still in the future). */
export function isSessionWindowOpen(
  start: Date | string,
  durationMinutes: number = DEFAULT_SESSION_DURATION_MINUTES,
  now: Date = new Date(),
): boolean {
  return getSessionEndTime(start, durationMinutes).getTime() > now.getTime();
}
