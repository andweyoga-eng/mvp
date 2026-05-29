import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { AdminClassSessionForEdit } from "@/components/admin/create-session-modal";
import { parseRecurrenceWeekdays } from "@shared/session-schedule";

interface SessionRow {
  id: string;
  date: string;
  classTypeId?: string;
  instructorId?: string;
  maxCapacity?: number;
  currentBookings?: number;
  googleMeetLink?: string | null;
  razorpayLink?: string | null;
  paymentMethod?: string | null;
  paymentQrCodeId?: string | null;
  qrContactPhone?: string | null;
  qrContactEmail?: string | null;
  status?: string;
  publishedAt?: string | null;
  recurrenceKind?: string | null;
  recurrenceWeekdays?: string | null;
  seriesId?: string | null;
  seriesWeekCount?: number | null;
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

function startOfWeek(date: Date) {
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
  return `${fmt(start)} – ${fmt(end)}`;
}

export function WeekScheduleGrid({
  sessions,
  onEditSession,
  onDeleteSession,
}: {
  sessions: SessionRow[];
  onEditSession?: (session: AdminClassSessionForEdit) => void;
  onDeleteSession?: (session: SessionRow) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

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

  const byDay = useMemo(() => {
    const map: Record<number, SessionRow[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const s of sessions) {
      const dt = new Date(s.date);
      if (dt < weekStart || dt > weekEnd) continue;
      map[dt.getDay()].push(s);
    }
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    );
    return map;
  }, [sessions, weekStart, weekEnd]);

  const toEditPayload = (s: SessionRow): AdminClassSessionForEdit => ({
    id: s.id,
    classTypeId: s.classTypeId!,
    instructorId: s.instructorId!,
    date: s.date,
    maxCapacity: s.maxCapacity ?? 20,
    googleMeetLink: s.googleMeetLink,
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
  });

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
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
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
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {days.map((day, idx) => (
          <div key={idx} className="min-h-[120px] rounded-lg border bg-white p-2">
            <p className="text-xs font-medium text-gray-600 mb-2">
              {DAY_LABELS[day.getDay()]}{" "}
              <span className="text-gray-400">
                {day.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </p>
            <div className="space-y-1">
              {(byDay[day.getDay()] || []).map((s) => (
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
                  {s.status && s.status !== "published" && (
                    <Badge variant="outline" className="mt-1 text-[10px] h-5">
                      {s.status}
                    </Badge>
                  )}
                  {(onEditSession || onDeleteSession) && (
                    <div className="flex gap-1 mt-1.5">
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
                      {onDeleteSession && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-red-600 border-red-200"
                          onClick={() => onDeleteSession(s)}
                        >
                          <Trash2 className="h-3 w-3 mr-0.5" /> Del
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
