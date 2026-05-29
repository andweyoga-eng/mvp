import {
  isSessionWindowOpen,
  resolveSessionDurationMinutes,
} from "@shared/session-window";

export function isTrialOrDropIn(
  sessionFrequency: string | null | undefined,
): boolean {
  return sessionFrequency === "trial" || sessionFrequency === "drop_in";
}

/** Recurring: book until session ends. Trial/drop-in: only before start time. */
export function isSessionBookable(
  sessionStart: Date | string,
  durationMinutes: number | null | undefined,
  sessionFrequency: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const startMs = new Date(sessionStart).getTime();
  const nowMs = now.getTime();
  if (isTrialOrDropIn(sessionFrequency)) {
    return startMs > nowMs;
  }
  return isSessionWindowOpen(
    sessionStart,
    resolveSessionDurationMinutes(durationMinutes),
    now,
  );
}

export function isTrialDropInMidSession(
  sessionStart: Date | string,
  durationMinutes: number | null | undefined,
  sessionFrequency: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!isTrialOrDropIn(sessionFrequency)) return false;
  const startMs = new Date(sessionStart).getTime();
  const nowMs = now.getTime();
  if (startMs > nowMs) return false;
  return isSessionWindowOpen(
    sessionStart,
    resolveSessionDurationMinutes(durationMinutes),
    now,
  );
}

export const TRIAL_DROPIN_MIDSESSION_MESSAGE =
  "This session has already begun — we keep trial and drop-in spaces calm for yogis who joined on time. Please book the next scheduled session instead; we would love to welcome you then.";
