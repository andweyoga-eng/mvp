import { getSessionEndTime, resolveSessionDurationMinutes } from "@shared/session-window";

export interface RecurringSeriesBounds {
  startAt: Date;
  endAt: Date;
}

/** Last moment of the series (end of the final session). */
export function getRecurringSeriesLastEnd(
  bounds: RecurringSeriesBounds,
  durationMinutes: number | null | undefined,
): Date {
  return getSessionEndTime(bounds.endAt, resolveSessionDurationMinutes(durationMinutes));
}

/**
 * Regular batch is "in progress" after the first session starts and before the last session ends.
 */
export function isRecurringBatchInProgress(
  bounds: RecurringSeriesBounds,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): boolean {
  const nowMs = now.getTime();
  const firstStartMs = new Date(bounds.startAt).getTime();
  const lastEndMs = getRecurringSeriesLastEnd(bounds, durationMinutes).getTime();
  return nowMs > firstStartMs && nowMs < lastEndMs;
}

/**
 * Block late join on a recurring series only when:
 * - batch is in progress, AND
 * - the session being booked has already started (not a future week in the batch).
 *
 * Future sessions in an ongoing batch remain bookable. Trial/drop-in rules are separate.
 */
export function shouldBlockRecurringMidBatchBooking(params: {
  sessionStart: Date | string;
  sessionFrequency: string | null | undefined;
  seriesId: string | null | undefined;
  seriesBounds: RecurringSeriesBounds | undefined;
  durationMinutes: number | null | undefined;
  now?: Date;
}): boolean {
  if (params.sessionFrequency !== "recurring" || !params.seriesId || !params.seriesBounds) {
    return false;
  }
  const now = params.now ?? new Date();
  if (!isRecurringBatchInProgress(params.seriesBounds, params.durationMinutes, now)) {
    return false;
  }
  const sessionStartMs = new Date(params.sessionStart).getTime();
  return sessionStartMs <= now.getTime();
}
