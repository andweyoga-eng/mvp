/** India Standard Time — fixed +05:30 (no DST). Studio schedules are authored in IST. */
export const IST_TIME_ZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type IstWallParts = {
  year: number;
  month: number; // 0–11
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
  /** 0=Sun … 6=Sat in the IST calendar */
  weekday: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Break an absolute instant into Asia/Kolkata wall-clock parts. */
export function getIstWallParts(date: Date | string): IstWallParts {
  const ms = new Date(date).getTime();
  if (Number.isNaN(ms)) {
    return { year: NaN, month: NaN, day: NaN, hour: NaN, minute: NaN, second: NaN, ms: NaN, weekday: NaN };
  }
  const shifted = new Date(ms + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    ms: shifted.getUTCMilliseconds(),
    weekday: shifted.getUTCDay(),
  };
}

/** Build an absolute instant from an Asia/Kolkata wall-clock. */
export function dateFromIstWall(parts: Omit<IstWallParts, "weekday">): Date {
  const utcMs =
    Date.UTC(
      parts.year,
      parts.month,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second ?? 0,
      parts.ms ?? 0,
    ) - IST_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Admin picker value `YYYY-MM-DDTHH:mm` is always IST wall time
 * (the picker is labeled "Time (IST)").
 */
export function parseIstDatetimeLocal(value: string): Date {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return new Date(NaN);
  const [, y, mo, d, h, mi, sec] = match;
  return dateFromIstWall({
    year: Number(y),
    month: Number(mo) - 1,
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: sec ? Number(sec) : 0,
    ms: 0,
  });
}

/** Format an absolute instant back to admin picker `YYYY-MM-DDTHH:mm` in IST. */
export function formatIstDatetimeLocal(date: Date | string): string {
  const p = getIstWallParts(date);
  if (Number.isNaN(p.year)) return "";
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/**
 * Parse a Postgres `timestamp without time zone` text as UTC.
 * Admin writes ISO/UTC components into the naive column; treating them as local
 * re-applies IST and shows 2:00 AM instead of 7:30 AM.
 */
export function parsePgTimestampAsUtc(value: string | null): Date | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const d = new Date(`${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Member/admin display helpers — always Asia/Kolkata. */
export function formatIstTime(date: Date | string, hour12 = true): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZone: IST_TIME_ZONE,
  });
}

export function formatIstDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: IST_TIME_ZONE,
  });
}

export function formatIstDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
