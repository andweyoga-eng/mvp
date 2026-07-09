/**
 * Session scheduling abstraction — manual admin entry today; external calendars later.
 * Maps cleanly to Google Calendar / Calendly-style one-time vs recurring events.
 */

export const SCHEDULE_SOURCES = ["manual", "google_calendar", "zoom", "zoho", "calendly"] as const;
export type ScheduleSource = (typeof SCHEDULE_SOURCES)[number];

export const RECURRENCE_KINDS = ["once", "weekly"] as const;
export type RecurrenceKind = (typeof RECURRENCE_KINDS)[number];

/** Max weekly repeats for MVP (admin-created series). */
export const MAX_WEEKLY_OCCURRENCES = 52;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function serializeRecurrenceWeekdays(days: number[]): string | null {
  const valid = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  return valid.length ? valid.join(",") : null;
}

export function parseRecurrenceWeekdays(value: string | null | undefined): number[] {
  if (!value?.trim()) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6),
    ),
  ].sort((a, b) => a - b);
}

export interface SessionScheduleMeta {
  scheduleSource: ScheduleSource;
  recurrenceKind: RecurrenceKind;
  seriesId: string | null;
  externalProvider: string | null;
  externalEventId: string | null;
}

/** Normalized slot for public week schedule (and future sync). */
export interface PublicScheduleSlot {
  id: string;
  title: string;
  startAt: string;
  durationMinutes: number;
  instructorName: string;
  source: ScheduleSource;
  recurrenceKind: RecurrenceKind;
  seriesId: string | null;
}

export interface RecurringScheduleInput {
  startAt: Date;
  recurrenceKind: RecurrenceKind;
  /** For weekly: number of calendar weeks in the series (2–52). */
  occurrenceCount: number;
  /** 0=Sun … 6=Sat; empty defaults to the start date's weekday only. */
  recurrenceWeekdays?: number[];
}

function occurrenceOnWeekday(
  startAt: Date,
  weekOffset: number,
  targetWeekday: number,
): Date {
  const anchor = new Date(startAt);
  anchor.setDate(anchor.getDate() + weekOffset * 7);
  let delta = targetWeekday - anchor.getDay();
  if (delta < 0) delta += 7;
  const result = new Date(anchor);
  result.setDate(anchor.getDate() + delta);
  result.setHours(
    startAt.getHours(),
    startAt.getMinutes(),
    startAt.getSeconds(),
    startAt.getMilliseconds(),
  );
  return result;
}

export function expandSessionOccurrences(input: RecurringScheduleInput): Date[] {
  if (input.recurrenceKind === "once") {
    return [new Date(input.startAt)];
  }

  const weeks = Math.min(Math.max(input.occurrenceCount, 1), MAX_WEEKLY_OCCURRENCES);
  const rawDays = (input.recurrenceWeekdays ?? []).filter((d) => d >= 0 && d <= 6);
  const weekdays =
    rawDays.length > 0
      ? [...new Set(rawDays)].sort((a, b) => a - b)
      : [input.startAt.getDay()];

  const startMs = input.startAt.getTime();
  const seen = new Set<number>();
  const dates: Date[] = [];

  for (let w = 0; w < weeks; w++) {
    for (const day of weekdays) {
      const d = occurrenceOnWeekday(input.startAt, w, day);
      if (d.getTime() < startMs) continue;
      const key = d.getTime();
      if (seen.has(key)) continue;
      seen.add(key);
      dates.push(d);
    }
  }

  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates;
}

export function defaultScheduleMeta(
  overrides?: Partial<SessionScheduleMeta>,
): SessionScheduleMeta {
  return {
    scheduleSource: "manual",
    recurrenceKind: "once",
    seriesId: null,
    externalProvider: null,
    externalEventId: null,
    ...overrides,
  };
}

/** Future: map Google Calendar event → our session shape */
export interface ExternalCalendarEventDraft {
  provider: ScheduleSource;
  externalEventId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  meetLink?: string | null;
  instructorId?: string | null;
  classTypeId?: string | null;
}

export function externalEventToScheduleMeta(
  event: ExternalCalendarEventDraft,
  seriesId?: string | null,
): SessionScheduleMeta {
  return {
    scheduleSource: event.provider,
    recurrenceKind: "once",
    seriesId: seriesId ?? null,
    externalProvider: event.provider,
    externalEventId: event.externalEventId,
  };
}
