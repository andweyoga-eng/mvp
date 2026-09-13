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

export type JoinPromptPhase = "soon" | "imminent" | "live" | "ending";

const JOIN_PROMPT_IMMINENT_MS = 5 * 60 * 1000;
const JOIN_PROMPT_ENDING_SOON_MS = 10 * 60 * 1000;

/** Coarse, friendly "x from now" phrasing for a positive duration in ms. */
function humanizeLeadTime(ms: number): string {
  if (ms <= 60_000) return "in less than a minute";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in about ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Friendly, schedule-aware message for the "Join session" control so members
 * know when the link becomes active. Mirrors getMeetJoinState's 1-hour window.
 */
export function getMeetJoinMessage(params: {
  sessionStart: Date;
  sessionDurationMinutes: number;
  isPaid: boolean;
  hasMeetLink: boolean;
  now?: Date;
}): string {
  if (!params.isPaid) return "Complete payment to unlock your session link.";
  if (!params.hasMeetLink)
    return "Your instructor hasn't added the session link yet. It'll appear here once they do.";

  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const startMs = params.sessionStart.getTime();
  const endMs = getSessionEndTime(params.sessionStart, params.sessionDurationMinutes).getTime();
  const openFrom = startMs - MEET_OPEN_BEFORE_MS;

  if (nowMs > endMs) return "This session has ended.";
  if (nowMs >= startMs) return "Your session is live now. Tap Join to enter.";
  if (nowMs >= openFrom) return "The room is open. Tap Join to enter.";
  return `Join opens 1 hour before class (${humanizeLeadTime(openFrom - nowMs)}).`;
}

export function getJoinPromptPhase(params: {
  sessionStart: Date;
  sessionDurationMinutes: number;
  now?: Date;
}): JoinPromptPhase {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const startMs = params.sessionStart.getTime();
  const endMs = getSessionEndTime(params.sessionStart, params.sessionDurationMinutes).getTime();

  if (nowMs >= endMs - JOIN_PROMPT_ENDING_SOON_MS && nowMs < endMs) return "ending";
  if (nowMs >= startMs && nowMs < endMs) return "live";
  if (nowMs < startMs && startMs - nowMs <= JOIN_PROMPT_IMMINENT_MS) return "imminent";
  return "soon";
}

/** Schedule-aware title, body, and CTA for the proactive join popup. */
export function getJoinPromptCelebrationCopy(params: {
  className: string;
  instructorName: string;
  sessionStart: Date;
  sessionDurationMinutes: number;
  now?: Date;
}): { title: string; description: string; primaryCta: string } {
  const now = params.now ?? new Date();
  const phase = getJoinPromptPhase({
    sessionStart: params.sessionStart,
    sessionDurationMinutes: params.sessionDurationMinutes,
    now,
  });
  const { className, instructorName, sessionStart } = params;
  const startMs = sessionStart.getTime();
  const untilStartMs = startMs - now.getTime();

  switch (phase) {
    case "live":
      return {
        title: "We are live",
        description: `${className} is in flow right now. ${instructorName} is on the mat. Hop in whenever you are ready.`,
        primaryCta: "Join now",
      };
    case "ending":
      return {
        title: "Still time to join",
        description: `${className} is wrapping up soon. Drop in for the final stretch if you can.`,
        primaryCta: "Hop in now",
      };
    case "imminent":
      return {
        title: "Almost time",
        description: `${className} is about to begin. Grab your mat. The room opens any moment.`,
        primaryCta: "Hop on Meet",
      };
    default:
      return {
        title: "Class is starting soon",
        description: `${className} begins ${humanizeLeadTime(untilStartMs)}. Roll out your mat. We will see you there.`,
        primaryCta: "Hop on Meet",
      };
  }
}
