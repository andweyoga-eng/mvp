export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Rolling 7-day window from today (matches public schedule API). */
export function getRollingWeekDateRange(now: Date = new Date()): {
  weekNumber: number;
  start: Date;
  end: Date;
  label: string;
} {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    });
  return {
    weekNumber: getIsoWeekNumber(start),
    start,
    end,
    label: `${fmt(start)} to ${fmt(end)}`,
  };
}

/** Single line for schedule day groups — weekday + short date. */
export function formatScheduleDayHeader(date: Date | string): string {
  const d = new Date(date);
  const weekday = d.toLocaleDateString("en-IN", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });
  const shortDate = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  return `${weekday} · ${shortDate}`;
}

export function getSessionEndMs(
  sessionStart: Date | string,
  durationMinutes: number | null | undefined,
  defaultMinutes = 60,
): number {
  const duration =
    typeof durationMinutes === "number" && durationMinutes > 0
      ? durationMinutes
      : defaultMinutes;
  return new Date(sessionStart).getTime() + duration * 60_000;
}
