import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Pencil, Pause, Play, Trash2 } from "lucide-react";
import type { AdminClassSessionForEdit } from "@/components/admin/create-session-modal";
import { isAdminSessionPaused } from "@shared/admin-session-actions";
import { parseRecurrenceWeekdays } from "@shared/session-schedule";
import { useIsBelowLg } from "@/hooks/use-mobile";

interface SessionRow {
  id: string;
  date: string;
  classTypeId?: string;
  instructorId?: string;
  maxCapacity?: number;
  currentBookings?: number;
  googleMeetLink?: string | null;
  deliveryMode?: string | null;
  sessionFrequency?: string | null;
  venueAddress?: string | null;
  venueMapLink?: string | null;
  venueContactPhone?: string | null;
  razorpayLink?: string | null;
  paymentMethod?: string | null;
  paymentQrCodeId?: string | null;
  qrContactPhone?: string | null;
  qrContactEmail?: string | null;
  status?: string;
  publishedAt?: string | null;
  pausedAt?: string | null;
  recurrenceKind?: string | null;
  recurrenceWeekdays?: string | null;
  seriesId?: string | null;
  seriesWeekCount?: number | null;
  flexiEnabled?: boolean | null;
  classType?: { name: string };
  instructor?: { name: string };
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIsoWeekInfo(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

export function startOfWeek(date: Date) {
  const s = new Date(date);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function inferSeriesWeekdays(sessions: SessionRow[], seriesId: string): number[] {
  const days = new Set<number>();
  for (const s of sessions) {
    if (s.seriesId === seriesId) {
      days.add(new Date(s.date).getDay());
    }
  }
  return [...days].sort((a, b) => a - b);
}

function formatRange(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `${fmt(start)} to ${fmt(end)}`;
}

export function WeekScheduleGrid({
  sessions,
  weekStart: controlledWeekStart,
  onWeekStartChange,
  onEditSession,
  onPauseSession,
  onResumeSession,
  onDeleteSession,
  isSuperAdmin = false,
}: {
  sessions: SessionRow[];
  /** When set, grid jumps to this week (e.g. after creating a session). */
  weekStart?: Date;
  onWeekStartChange?: (start: Date) => void;
  onEditSession?: (session: AdminClassSessionForEdit) => void;
  onPauseSession?: (session: SessionRow) => void;
  onResumeSession?: (session: SessionRow) => void;
  onDeleteSession?: (session: SessionRow) => void;
  isSuperAdmin?: boolean;
}) {
  const isBelowLg = useIsBelowLg();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  useEffect(() => {
    if (controlledWeekStart) {
      setWeekStart(startOfWeek(controlledWeekStart));
    }
  }, [controlledWeekStart]);

  const { week, year } = getIsoWeekInfo(weekStart);
  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }, [weekStart]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const visibleDays = useMemo(
    () => (isBelowLg ? [...days].reverse() : days),
    [days, isBelowLg],
  );

  const byDay = useMemo(() => {
    const map: Record<number, SessionRow[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const s of sessions) {
      const dt = new Date(s.date);
      if (dt < weekStart || dt > weekEnd) continue;
      map[dt.getDay()].push(s);
    }
    const sortDirection = isBelowLg ? -1 : 1;
    Object.values(map).forEach((list) =>
      list.sort(
        (a, b) =>
          (new Date(a.date).getTime() - new Date(b.date).getTime()) * sortDirection,
      ),
    );
    return map;
  }, [sessions, weekStart, weekEnd, isBelowLg]);

  const toEditPayload = (s: SessionRow): AdminClassSessionForEdit => ({
    id: s.id,
    classTypeId: s.classTypeId!,
    instructorId: s.instructorId!,
    date: s.date,
    maxCapacity: s.maxCapacity ?? 20,
    googleMeetLink: s.googleMeetLink,
    deliveryMode: s.deliveryMode,
    sessionFrequency: s.sessionFrequency,
    venueAddress: s.venueAddress,
    venueMapLink: s.venueMapLink,
    venueContactPhone: s.venueContactPhone,
    paymentMethod: s.paymentMethod,
    razorpayLink: s.razorpayLink,
    paymentQrCodeId: s.paymentQrCodeId,
    qrContactPhone: s.qrContactPhone,
    qrContactEmail: s.qrContactEmail,
    status: s.status,
    publishedAt: s.publishedAt,
    recurrenceKind: s.recurrenceKind,
    recurrenceWeekdays: (() => {
      const stored = parseRecurrenceWeekdays(s.recurrenceWeekdays);
      if (stored.length) return stored;
      if (s.recurrenceKind === "weekly" && s.seriesId) {
        return inferSeriesWeekdays(sessions, s.seriesId);
      }
      return [];
    })(),
    occurrenceCount: s.seriesWeekCount != null ? String(s.seriesWeekCount) : "1",
    seriesId: s.seriesId,
    seriesWeekCount: s.seriesWeekCount,
    flexiEnabled: !!s.flexiEnabled,
  });

  const showSessionActions =
    onEditSession || onPauseSession || onResumeSession || onDeleteSession;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#3d1b80]">
            Week {week}, {year}
          </p>
          <p className="text-xs text-muted-foreground">{formatRange(weekStart)} (IST)</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const n = new Date(weekStart);
              n.setDate(n.getDate() - 7);
              setWeekStart(n);
              onWeekStartChange?.(n);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const n = startOfWeek(new Date());
              setWeekStart(n);
              onWeekStartChange?.(n);
            }}
          >
            This week
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const n = new Date(weekStart);
              n.setDate(n.getDate() + 7);
              setWeekStart(n);
              onWeekStartChange?.(n);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {visibleDays.map((day) => (
          <div key={day.toDateString()} className="min-h-[120px] rounded-lg border bg-white p-2">
            <p className="text-xs font-medium text-gray-600 mb-2">
              {DAY_LABELS[day.getDay()]}{" "}
              <span className="text-gray-400">
                {day.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </p>
            <div className="space-y-1">
              {(byDay[day.getDay()] || []).map((s) => {
                const paused = isAdminSessionPaused(s);
                return (
                  <div key={s.id} className="rounded-md bg-[#f5f0ff] px-2 py-1.5 text-xs">
                    <p className="font-medium truncate">{s.classType?.name || "Session"}</p>
                    <p className="text-gray-500 truncate">
                      {new Date(s.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })}{" "}
                      · {s.instructor?.name}
                    </p>
                    {paused ? (
                      <Badge variant="outline" className="mt-1 text-[10px] h-5 border-amber-300 text-amber-800">
                        Paused
                      </Badge>
                    ) : s.status && s.status !== "published" ? (
                      <Badge variant="outline" className="mt-1 text-[10px] h-5">
                        {s.status}
                      </Badge>
                    ) : null}
                    {showSessionActions && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {onEditSession && s.classTypeId && s.instructorId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => onEditSession(toEditPayload(s))}
                          >
                            <Pencil className="h-3 w-3 mr-0.5" /> Edit
                          </Button>
                        )}
                        {!paused && onPauseSession && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-amber-700 border-amber-200"
                            onClick={() => onPauseSession(s)}
                          >
                            <Pause className="h-3 w-3 mr-0.5" /> Pause
                          </Button>
                        )}
                        {paused && onResumeSession && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-green-700 border-green-200"
                            onClick={() => onResumeSession(s)}
                          >
                            <Play className="h-3 w-3 mr-0.5" /> Resume
                          </Button>
                        )}
                        {isSuperAdmin && onDeleteSession && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-red-600 border-red-200"
                            onClick={() => onDeleteSession(s)}
                          >
                            <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!byDay[day.getDay()]?.length && (
                <p className="text-[10px] text-gray-400 italic">No sessions</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
