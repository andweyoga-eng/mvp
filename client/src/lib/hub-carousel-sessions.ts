import { filterBookableSessions, type BookableSession } from "@/lib/booking-flow";
import {
  formatRecurringWeekdayList,
  formatSessionTime,
  getRecurringWeekdays,
  isFixedRecurringCheckout,
  type RecurringSessionLike,
} from "@/lib/recurring-series-display";

export type HubCarouselSession = BookableSession &
  RecurringSessionLike & {
    id: string;
    deliveryMode?: string | null;
  };

export interface HubCarouselScheduleDisplay {
  label: string;
  isRecurringSeries: boolean;
}

/** Compact schedule line for hub carousel cards. */
export function formatHubCarouselSchedule(
  session: RecurringSessionLike & { date: Date | string },
): HubCarouselScheduleDisplay {
  if (isFixedRecurringCheckout(session)) {
    const days = formatRecurringWeekdayList(getRecurringWeekdays(session));
    const time = session.date ? formatSessionTime(session.date) : "";
    return {
      label: days && time ? `${days} · ${time}` : days || time,
      isRecurringSeries: true,
    };
  }

  const d = new Date(session.date!);
  const dayDate = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = formatSessionTime(d);
  return {
    label: `${dayDate} · ${time}`,
    isRecurringSeries: false,
  };
}

/**
 * One carousel card per fixed recurring series; individual cards for trial, drop-in, and one-offs.
 * Uses the soonest bookable occurrence as the series representative.
 */
export function collapseBookableForCarousel<T extends HubCarouselSession>(
  sessions: T[],
  limit = 12,
  now: Date = new Date(),
): T[] {
  const bookable = filterBookableSessions(sessions, now);
  const seenSeries = new Set<string>();
  const collapsed: T[] = [];

  for (const session of bookable) {
    if (isFixedRecurringCheckout(session) && session.seriesId) {
      if (seenSeries.has(session.seriesId)) continue;
      seenSeries.add(session.seriesId);
    }
    collapsed.push(session);
    if (collapsed.length >= limit) break;
  }

  return collapsed;
}
