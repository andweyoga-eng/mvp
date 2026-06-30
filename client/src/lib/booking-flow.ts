import type { BookingIntent, BookingScrollTarget } from "@/lib/pending-booking";
import { isSessionBookable } from "@shared/booking-eligibility";
import {
  DEFAULT_SESSION_DURATION_MINUTES,
  isSessionWindowOpen,
  resolveSessionDurationMinutes,
} from "@shared/session-window";

export function sessionDurationMinutes(session: {
  classType?: { duration?: number | null };
}): number {
  return resolveSessionDurationMinutes(session.classType?.duration);
}

/** True while the session has not ended (uses class type duration when provided). */
export function isSessionUpcoming(
  date: Date | string,
  now: Date = new Date(),
  durationMinutes: number = DEFAULT_SESSION_DURATION_MINUTES,
): boolean {
  return isSessionWindowOpen(date, durationMinutes, now);
}

export interface BookableSession {
  date: Date | string;
  currentBookings: number;
  maxCapacity: number;
  classType?: { duration?: number | null };
  sessionFrequency?: string | null;
}

export interface ScheduleDayLike<T extends { date: Date | string }> {
  classes: T[];
}

/** Week schedule days with only sessions that start after now; drops empty days. */
export function filterUpcomingScheduleDays<T extends { date: Date | string }>(
  days: ScheduleDayLike<T>[],
  now: Date = new Date(),
): ScheduleDayLike<T>[] {
  return days
    .map((day) => ({
      ...day,
      classes: day.classes.filter((cls) =>
        isSessionUpcoming(cls.date, now, sessionDurationMinutes(cls)),
      ),
    }))
    .filter((day) => day.classes.length > 0);
}

/** Sessions open for booking with capacity, sorted soonest first. */
export function filterBookableSessions<T extends BookableSession>(
  sessions: T[],
  now: Date = new Date(),
): T[] {
  return sessions
    .filter((cls) =>
      isSessionBookable(
        cls.date,
        sessionDurationMinutes(cls),
        cls.sessionFrequency,
        now,
      ),
    )
    .filter((cls) => cls.currentBookings < cls.maxCapacity)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Normalizes schedule (session id string) vs structured intent from and We Flow / nav. */
export function normalizeBookingIntent(
  input?: string | BookingIntent | null,
): BookingIntent {
  if (!input) return { scrollTo: "schedule" };
  if (typeof input === "string") {
    return { sessionId: input, scrollTo: "schedule" };
  }
  return {
    sessionId: input.sessionId,
    classTypeId: input.classTypeId,
    scrollTo: input.scrollTo ?? (input.sessionId ? "schedule" : input.classTypeId ? "teach" : "schedule"),
  };
}

export function scrollToBookingSection(target: BookingScrollTarget) {
  const id = target === "teach" ? "teach" : "schedule";
  const element = document.getElementById(id);
  if (!element) return;
  const headerHeight = 64;
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
}
