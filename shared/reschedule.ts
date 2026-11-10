/**
 * SPEC-SESSIONS-01 FR-50/51 — reschedule eligibility helpers (platform-cancel path only).
 */
import { computeRescheduleDeadline } from "./cancellation-policy";

export type RescheduleWindowInput = {
  cancelAt: Date;
  horizonStartAt?: Date | null;
  horizonEndAt?: Date | null;
  now?: Date;
};

export type RescheduleWindow = {
  windowStart: Date;
  windowEnd: Date;
  /** True when now is still before the deadline. */
  open: boolean;
};

/** Eligible target dates: max(now, horizonStart) .. reschedule deadline. */
export function computeRescheduleWindow(input: RescheduleWindowInput): RescheduleWindow {
  const now = input.now ?? new Date();
  const deadline = computeRescheduleDeadline({
    cancelAt: input.cancelAt,
    horizonEndAt: input.horizonEndAt ?? null,
  });
  const horizonStart = input.horizonStartAt ? new Date(input.horizonStartAt) : null;
  const startCandidates = [now.getTime()];
  if (horizonStart && !Number.isNaN(horizonStart.getTime())) {
    startCandidates.push(horizonStart.getTime());
  }
  const windowStart = new Date(Math.max(...startCandidates));
  return {
    windowStart,
    windowEnd: deadline,
    open: now.getTime() <= deadline.getTime(),
  };
}

/** Own instructor first, then soonest session. */
export function sortRescheduleTargets<T extends { instructorId: string; date: Date | string }>(
  rows: T[],
  preferredInstructorId: string | null | undefined,
): T[] {
  const pref = preferredInstructorId ?? "";
  return [...rows].sort((a, b) => {
    const aOwn = a.instructorId === pref ? 0 : 1;
    const bOwn = b.instructorId === pref ? 0 : 1;
    if (aOwn !== bOwn) return aOwn - bOwn;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}
