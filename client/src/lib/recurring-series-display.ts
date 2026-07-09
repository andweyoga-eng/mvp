import { parseRecurrenceWeekdays, WEEKDAY_LABELS } from "@shared/session-schedule";

export interface RecurringSessionLike {
  sessionFrequency?: string | null;
  recurrenceKind?: string | null;
  seriesId?: string | null;
  recurrenceWeekdays?: string | null;
  seriesWeekCount?: number | null;
  date?: Date | string;
}

/** Weekly recurring series with fixed weekdays — no date/time picker at checkout. */
export function isFixedRecurringCheckout(
  session: RecurringSessionLike | null | undefined,
): boolean {
  if (!session) return false;
  if (session.sessionFrequency !== "recurring") return false;
  if (session.recurrenceKind !== "weekly") return false;
  if (!session.seriesId) return false;
  return parseRecurrenceWeekdays(session.recurrenceWeekdays).length > 0;
}

export function getRecurringWeekdays(session: RecurringSessionLike): number[] {
  return parseRecurrenceWeekdays(session.recurrenceWeekdays);
}

export function formatRecurringWeekdayList(weekdays: number[]): string {
  if (!weekdays.length) return "";
  const labels = weekdays.map((d) => WEEKDAY_LABELS[d] ?? "");
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

export function formatSessionTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatCompactRecurringWeekdayList(weekdays: number[]): string {
  if (!weekdays.length) return "";
  return weekdays.map((d) => WEEKDAY_LABELS[d] ?? "").join("-");
}

export function formatSessionLongDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "Every Mon & Wed · 6:30 PM" */
export function formatRecurringScheduleLine(
  session: RecurringSessionLike,
  timeSource?: Date | string,
): string {
  const weekdays = getRecurringWeekdays(session);
  const days = formatRecurringWeekdayList(weekdays);
  const when = timeSource ?? session.date;
  if (!days || !when) return "";
  return `Every ${days} · ${formatSessionTime(when)}`;
}

export function formatFixedSlotScheduleLine(
  session: RecurringSessionLike,
  timeSource?: Date | string,
): string {
  const weekdays = getRecurringWeekdays(session);
  const days = formatCompactRecurringWeekdayList(weekdays);
  const when = timeSource ?? session.date;
  if (!days || !when) return "";
  return `${days} ${formatSessionTime(when)}`;
}

export function formatSeriesDurationWeeks(seriesWeekCount: number | null | undefined): string | null {
  if (seriesWeekCount == null || seriesWeekCount < 1) return null;
  return `${seriesWeekCount} week${seriesWeekCount === 1 ? "" : "s"}`;
}
