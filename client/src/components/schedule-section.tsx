import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { filterUpcomingScheduleDays } from "@/lib/booking-flow";
import { getSessionBadgeLabel, SESSION_INFO_BADGE_CLASSNAME } from "@/lib/session-badges";
import {
  formatScheduleDayHeader,
  getRollingWeekDateRange,
} from "@shared/schedule-display";
import { SectionHeading } from "@/components/digital-zen/section-heading";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import hyyocrossImg from "@assets/Hyyocross_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";
import { cn } from "@/lib/utils";
import { AvailableTodaySessionCard } from "@/components/available-today-session-card";

interface ClassType {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
}

interface ScheduleDay {
  day: string;
  date: Date;
  classes: Array<{
    id: string;
    date: Date;
    classType: ClassType;
    instructor: { id: string; name: string };
    currentBookings: number;
    maxCapacity: number;
    sessionFrequency?: string | null;
    deliveryMode?: string | null;
  }>;
}

interface ScheduleSectionProps {
  onBookingClick: (classId?: string) => void;
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

/**
 * Minimum number of cards required to render the "Available Today" carousel.
 * Below this we hide the whole block so a lone card with empty space never shows.
 */
const MIN_AVAILABLE_TODAY_CARDS = 3;

const CLASS_IMAGES: Record<string, string> = {
  "Hatha Yoga": hathaYogaImg,
  Hyyocross: hyyocrossImg,
  Meditation: meditationImg,
  "Sound Therapy": soundtherapyImg,
};

function classImageFor(classType: { name: string; imageUrl?: string | null }): string | undefined {
  if (classType.imageUrl) return classType.imageUrl;
  return CLASS_IMAGES[classType.name];
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function instructorInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ScheduleSection({ onBookingClick }: ScheduleSectionProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const availCarouselRef = useRef<HTMLDivElement>(null);
  const weeklyListRef = useRef<HTMLDivElement>(null);
  const weeklyHeaderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedDayKey, setHighlightedDayKey] = useState<string | null>(null);

  const { data: weeklySchedule, isLoading, error } = useQuery<ScheduleDay[]>({
    queryKey: ["/api/schedule/week"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: promotions } = useQuery<
    Array<{ promotionId: string; position: number; session: ScheduleDay["classes"][number] }>
  >({
    queryKey: ["/api/carousel/promotions"],
    refetchInterval: 30000,
  });

  const upcomingSchedule = useMemo(
    () => (weeklySchedule ? filterUpcomingScheduleDays(weeklySchedule) : []),
    [weeklySchedule],
  );

  const rollingWeek = useMemo(() => getRollingWeekDateRange(), []);

  const todaySessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = upcomingSchedule.find((d) => {
      const first = d.classes[0];
      return first ? sameCalendarDay(new Date(first.date), today) : false;
    });
    return day?.classes ?? [];
  }, [upcomingSchedule]);

  /**
   * The cards shown in the "Available Today" carousel.
   * When super admins have live promotions, those sessions are merged into
   * today's sessions at their configured placement. Otherwise we fall back to
   * the regular today's-sessions rotation.
   */
  const carouselSessions = useMemo(() => {
    const active = promotions ?? [];
    if (active.length === 0) return todaySessions;
    const sorted = [...active].sort((a, b) => a.position - b.position);
    const promotedIds = new Set(sorted.map((p) => p.session.id));
    const base = todaySessions.filter((s) => !promotedIds.has(s.id));
    for (const p of sorted) {
      const idx = Math.min(Math.max(p.position, 0), base.length);
      base.splice(idx, 0, p.session);
    }
    return base;
  }, [promotions, todaySessions]);

  const sessionsByDateKey = useMemo(() => {
    const map = new Map<string, ScheduleDay["classes"]>();
    for (const day of upcomingSchedule) {
      const first = day.classes[0];
      if (!first) continue;
      const key = new Date(first.date).toDateString();
      map.set(key, day.classes);
    }
    return map;
  }, [upcomingSchedule]);

  const formatTimeIST = (date: Date) =>
    new Date(date).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

  const scrollCarousel = (dir: "left" | "right") => {
    const el = availCarouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const jumpToWeeklyDay = (dateKey: string) => {
    const header = weeklyHeaderRefs.current.get(dateKey);
    if (!header) return;
    header.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightedDayKey(dateKey);
    window.setTimeout(() => setHighlightedDayKey((k) => (k === dateKey ? null : k)), 1600);
  };

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startPad = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      day: number | null;
      date?: Date;
      dateKey?: string;
      hasSessions?: boolean;
      soldOut?: boolean;
      isToday?: boolean;
      thumbnailUrl?: string;
    }> = [];

    for (let i = 0; i < startPad; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = date.toDateString();
      const sessions = sessionsByDateKey.get(key) ?? [];
      const hasSessions = sessions.length > 0;
      const soldOut =
        hasSessions && sessions.every((s) => s.currentBookings >= s.maxCapacity);
      const thumbnailUrl = hasSessions
        ? classImageFor(sessions[0].classType)
        : undefined;
      cells.push({
        day: d,
        date,
        dateKey: key,
        hasSessions,
        soldOut,
        isToday: sameCalendarDay(date, new Date()),
        thumbnailUrl,
      });
    }
    return cells;
  }, [calendarMonth, sessionsByDateKey]);

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  const weeklyRows = useMemo(() => {
    const rows: Array<
      | { type: "header"; label: string; dateKey: string }
      | {
          type: "session";
          title: string;
          meta: string;
          badge: string | null;
          initials: string;
          soldOut: boolean;
          sessionId: string;
          classType: ClassType;
        }
    > = [];
    for (const day of upcomingSchedule) {
      const first = day.classes[0];
      if (!first) continue;
      rows.push({
        type: "header",
        label: formatScheduleDayHeader(first.date),
        dateKey: new Date(first.date).toDateString(),
      });
      for (const cls of day.classes) {
        const soldOut = cls.currentBookings >= cls.maxCapacity;
        rows.push({
          type: "session",
          title: cls.classType.name,
          meta: `${formatTimeIST(cls.date)} · ${cls.instructor.name}`,
          badge: getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode),
          initials: instructorInitials(cls.instructor.name),
          soldOut,
          sessionId: cls.id,
          classType: {
            id: cls.classType.id,
            name: cls.classType.name,
            description: "",
            duration: 60,
            price: cls.classType.price,
          },
        });
      }
    }
    return rows;
  }, [upcomingSchedule]);

  if (error) {
    return (
      <section id="schedule" className="relative bg-dz-surface py-16 md:py-20">
        <PageContainer className="text-center">
          <h2 className="font-display text-3xl font-bold text-destructive">Unable to Load Schedule</h2>
          <p className="mt-2 text-dz-muted">Please try again later.</p>
        </PageContainer>
      </section>
    );
  }

  return (
    <section id="schedule" className="relative bg-dz-surface py-12 md:py-20">
      <div
        className="pointer-events-none absolute right-[-8%] top-[6%] h-[520px] w-[520px] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-primary/5 blur-[80px]"
        aria-hidden
      />
      <PageContainer className="relative">
        <SectionHeading
          title={`Week ${rollingWeek.weekNumber}`}
          accent="Schedule"
          subtitle={`Find the perfect time for your practice, ${rollingWeek.label}`}
        />

        {/* Available Today — only shown when enough cards exist to fill the first fold */}
        {(isLoading || carouselSessions.length >= MIN_AVAILABLE_TODAY_CARDS) && (
        <GlassCard className="mb-6 p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2.5">
              <h3 className="font-display text-xl font-semibold text-foreground">Available Today</h3>
              <span className="text-sm font-medium text-dz-muted">{todayLabel}</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              {carouselSessions.length} live session{carouselSessions.length === 1 ? "" : "s"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-[286px] shrink-0 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="relative px-8">
              <button
                type="button"
                onClick={() => scrollCarousel("left")}
                className="absolute left-0 top-1/2 z-[5] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-primary/10 bg-white/95 text-primary shadow-md transition hover:bg-primary hover:text-white"
                aria-label="Previous sessions"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel("right")}
                className="absolute right-0 top-1/2 z-[5] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-primary/10 bg-white/95 text-primary shadow-md transition hover:bg-primary hover:text-white"
                aria-label="Next sessions"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div
                ref={availCarouselRef}
                className="scrollbar-hide flex snap-x snap-proximity gap-4 overflow-x-auto pb-1"
              >
                {carouselSessions.map((cls) => {
                  const imageUrl = classImageFor(cls.classType);
                  const soldOut = cls.currentBookings >= cls.maxCapacity;
                  return (
                    <AvailableTodaySessionCard
                      key={cls.id}
                      sessionId={cls.id}
                      className={cls.classType.name}
                      instructorName={cls.instructor.name}
                      timeLabel={formatTimeIST(cls.date)}
                      price={cls.classType.price}
                      imageUrl={imageUrl}
                      soldOut={soldOut}
                      onBook={(id) => onBookingClick(id)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>
        )}

        <div className="flex flex-wrap items-stretch gap-6">
          {/* Compact calendar */}
          <GlassCard className="flex min-w-[min(100%,400px)] flex-1 flex-col p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-lg font-semibold">{monthLabel}</h3>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full text-dz-muted hover:bg-primary/5 hover:text-primary"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full text-dz-muted hover:bg-primary/5 hover:text-primary"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="rounded-full border border-primary/20 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                Today
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 border-b border-primary/5 pb-2 text-center">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "text-[10px] font-semibold tracking-wider",
                    i >= 5 ? "text-dz-secondary" : "text-dz-muted",
                  )}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calendarCells.map((cell, i) => {
                if (cell.day == null) return <div key={i} className="min-h-[46px]" />;

                if (!cell.hasSessions) {
                  return (
                    <div
                      key={i}
                      className="flex min-h-[46px] flex-col items-center justify-start py-1"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                          cell.isToday
                            ? "bg-primary font-semibold text-white"
                            : "text-foreground",
                        )}
                      >
                        {cell.day}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="flex min-h-[46px] flex-col items-center justify-start py-1"
                  >
                    <button
                      type="button"
                      onClick={() => cell.dateKey && jumpToWeeklyDay(cell.dateKey)}
                      className="group flex flex-col items-center gap-1"
                      aria-label={`View sessions on ${monthLabel} ${cell.day}`}
                      data-testid={`calendar-day-${cell.day}`}
                    >
                      <span
                        className={cn(
                          "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border text-sm font-semibold leading-none transition",
                          cell.isToday
                            ? "border-primary bg-primary text-white"
                            : "border-primary/40 text-foreground group-hover:border-primary",
                        )}
                      >
                        {cell.thumbnailUrl && !cell.isToday ? (
                          <img
                            src={cell.thumbnailUrl}
                            alt=""
                            aria-hidden
                            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
                          />
                        ) : null}
                        <span className="relative">{cell.day}</span>
                      </span>
                      {cell.soldOut ? (
                        <span className="text-[8px] font-bold uppercase tracking-wide text-destructive">
                          Sold out
                        </span>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 border-t border-primary/5 pt-3 text-xs text-dz-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Tap a day to view its sessions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                Sold out
              </span>
            </div>
          </GlassCard>

          {/* Weekly schedule */}
          <GlassCard className="flex min-w-[min(100%,400px)] flex-1 flex-col p-4 md:p-6">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Weekly Schedule</h3>
              <span className="text-xs font-medium text-dz-muted">All classes this week</span>
            </div>
            <div
              ref={weeklyListRef}
              className="max-h-[320px] flex-1 overflow-y-auto pr-2"
            >
              {isLoading ? (
                <div className="space-y-3 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : weeklyRows.length > 0 ? (
                weeklyRows.map((row, i) =>
                  row.type === "header" ? (
                    <div
                      key={`h-${i}`}
                      ref={(el) => {
                        if (el) weeklyHeaderRefs.current.set(row.dateKey, el);
                        else weeklyHeaderRefs.current.delete(row.dateKey);
                      }}
                      className={cn(
                        "sticky top-0 z-[1] border-b border-primary/5 bg-white/90 py-2 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm transition-colors",
                        highlightedDayKey === row.dateKey &&
                          "rounded-md bg-primary/10 px-2",
                      )}
                    >
                      {row.label}
                    </div>
                  ) : (
                    <div
                      key={`s-${row.sessionId}-${i}`}
                      className="flex items-center gap-3 border-b border-primary/5 py-2.5 last:border-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-dz-secondary text-xs font-bold text-white">
                        {row.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "font-display text-sm font-semibold",
                            row.soldOut ? "text-dz-muted line-through" : "text-foreground",
                          )}
                        >
                          {row.title}
                        </div>
                        <div className="text-xs text-dz-muted">{row.meta}</div>
                      </div>
                      {row.badge ? (
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 whitespace-nowrap", SESSION_INFO_BADGE_CLASSNAME)}
                        >
                          {row.badge}
                        </Badge>
                      ) : null}
                      <Button
                        size="sm"
                        className="shrink-0 rounded-lg bg-primary text-xs font-semibold"
                        disabled={row.soldOut}
                        onClick={() => onBookingClick(row.sessionId)}
                        data-testid={`book-class-${row.sessionId}`}
                      >
                        {row.soldOut ? "Full" : "Book"}
                      </Button>
                    </div>
                  ),
                )
              ) : (
                <p className="py-8 text-center text-sm text-dz-muted">No upcoming classes this week.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </PageContainer>
    </section>
  );
}
