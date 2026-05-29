/** Meet link is active from 1 hour before session start until session end. */
export const MEET_OPEN_BEFORE_MS = 60 * 60 * 1000;

/** Proactive join popup opens 30 minutes before session start. */
export const JOIN_PROMPT_BEFORE_MS = 30 * 60 * 1000;

export type MeetJoinState = "hidden" | "disabled" | "active";

export function getSessionEndTime(sessionStart: Date, durationMinutes: number): Date {
  const mins = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60;
  return new Date(sessionStart.getTime() + mins * 60_000);
}

export function getMeetJoinState(params: {
  sessionStart: Date;
  sessionDurationMinutes: number;
  isPaid: boolean;
  hasMeetLink: boolean;
  now?: Date;
}): MeetJoinState {
  if (!params.hasMeetLink || !params.isPaid) return "hidden";
  const now = params.now ?? new Date();
  const startMs = params.sessionStart.getTime();
  const endMs = getSessionEndTime(params.sessionStart, params.sessionDurationMinutes).getTime();
  const openFrom = startMs - MEET_OPEN_BEFORE_MS;
  if (now.getTime() < openFrom || now.getTime() > endMs) return "disabled";
  return "active";
}

export function isWithinJoinPromptWindow(params: {
  sessionStart: Date;
  sessionDurationMinutes: number;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const startMs = params.sessionStart.getTime();
  const endMs = getSessionEndTime(params.sessionStart, params.sessionDurationMinutes).getTime();
  const openFrom = startMs - JOIN_PROMPT_BEFORE_MS;
  return now.getTime() >= openFrom && now.getTime() <= endMs;
}
