import { getSessionEndTime, resolveSessionDurationMinutes } from "@shared/session-window";

export type SeriesEnrollmentClass = {
  id: string;
  date: Date | string;
  cancelledAt?: Date | string | null;
  pausedAt?: Date | string | null;
  status?: string | null;
};

/** Classes in a recurring package from the purchased/anchor session onward. */
export function filterSeriesClassesFromAnchor<T extends SeriesEnrollmentClass>(
  classesInSeries: readonly T[],
  anchorDate: Date | string,
): T[] {
  const fromMs = new Date(anchorDate).getTime();
  return classesInSeries
    .filter((cls) => {
      if (cls.cancelledAt || cls.status === "cancelled") return false;
      if (cls.pausedAt || cls.status === "paused") return false;
      if (cls.status === "draft") return false;
      return new Date(cls.date).getTime() >= fromMs;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function countSeriesSessionsFromAnchor(
  classesInSeries: readonly SeriesEnrollmentClass[],
  anchorDate: Date | string,
): number {
  return Math.max(1, filterSeriesClassesFromAnchor(classesInSeries, anchorDate).length);
}

/** Mapping status for a series seat: completed once the session window has ended. */
export function recurringEnrollmentMappingStatus(
  sessionStart: Date | string,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): "upcoming" | "completed" {
  const endMs = getSessionEndTime(sessionStart, resolveSessionDurationMinutes(durationMinutes)).getTime();
  return endMs <= now.getTime() ? "completed" : "upcoming";
}

export function countCompletedAmongEnrollment(
  classes: ReadonlyArray<{ date: Date | string }>,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): number {
  return classes.filter(
    (cls) => recurringEnrollmentMappingStatus(cls.date, durationMinutes, now) === "completed",
  ).length;
}
