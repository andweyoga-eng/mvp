import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AvailableTodaySessionCard } from "@/components/available-today-session-card";
import { filterUpcomingScheduleDays } from "@/lib/booking-flow";
import { getSessionBadgeLabel, SESSION_INFO_BADGE_CLASSNAME } from "@/lib/session-badges";
import { formatScheduleDayHeader, getRollingWeekDateRange } from "@shared/schedule-display";
import { CLASS_INTENSITIES, type ClassIntensity } from "@shared/schema";
import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import hyyocrossImg from "@assets/Hyyocross_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";

interface CalClassType {
  id: string;
  name: string;
  price: number;
  duration?: number;
  intensity?: string | null;
}

interface CalSession {
  id: string;
  date: string | Date;
  classType: CalClassType;
  instructor: { id: string; name: string };
  currentBookings: number;
  maxCapacity: number;
  sessionFrequency?: string | null;
  deliveryMode?: string | null;
}

interface ScheduleDay {
  day: string;
  date: string | Date;
  classes: CalSession[];
}

type ViewMode = "grid" | "list";
type IntensityFilter = ClassIntensity | "All";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const MIN_AVAILABLE_TODAY_CARDS = 3;

const CLASS_IMAGES: Record<string, string> = {
  "Hatha Yoga": hathaYogaImg,
  Hyyocross: hyyocrossImg,
  Meditation: meditationImg,
  "Sound Therapy": soundtherapyImg,
};

function classImageFor(name: string): string | undefined {
  return CLASS_IMAGES[name];
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

function formatTimeIST(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function sessionIntensity(s: CalSession): ClassIntensity {
  const value = s.classType.intensity;
  return (CLASS_INTENSITIES as readonly string[]).includes(value ?? "")
    ? (value as ClassIntensity)
    : "Moderate";
}

export default function Calendar() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [view, setView] = useState<ViewMode>("grid");
  const [intensity, setIntensity] = useState<IntensityFilter>("All");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [highlightedDayKey, setHighlightedDayKey] = useState<string | null>(null);

  const availCarouselRef = useRef<HTMLDivElement>(null);
  const weeklyHeaderRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const { data: weeklySchedule, isLoading, error } = useQuery<ScheduleDay[]>({
    queryKey: ["/api/schedule/week"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: promotions } = useQuery<
    Array<{ promotionId: string; position: number; session: CalSession }>
  >({
    queryKey: ["/api/carousel/promotions"],
    refetchInterval: 30000,
  });

  const rollingWeek = useMemo(() => getRollingWeekDateRange(), []);

  const upcomingSchedule = useMemo(
    () => (weeklySchedule ? filterUpcomingScheduleDays(weeklySchedule) : []),
    [weeklySchedule],
  );

  const matchesIntensity = (s: CalSession) =>
    intensity === "All" || sessionIntensity(s) === intensity;

  const todaySessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = upcomingSchedule.find((d) => {
      const first = d.classes[0];
      return first ? sameCalendarDay(new Date(first.date), today) : false;
    });
    return day?.classes ?? [];
  }, [upcomingSchedule]);

  /** Admin promotions merged at their placement, else regular today's rotation. */
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

  const filteredCarousel = useMemo(
    () => carouselSessions.filter(matchesIntensity),
    [carouselSessions, intensity],
  );

  const filteredDays = useMemo(
    () =>
      upcomingSchedule
        .map((d) => ({ ...d, classes: d.classes.filter(matchesIntensity) }))
        .filter((d) => d.classes.length > 0),
    [upcomingSchedule, intensity],
  );

  const sessionsByDateKey = useMemo(() => {
    const map = new Map<string, CalSession[]>();
    for (const day of upcomingSchedule) {
      const first = day.classes[0];
      if (!first) continue;
      map.set(new Date(first.date).toDateString(), day.classes);
    }
    return map;
  }, [upcomingSchedule]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const startPad = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      day: number | null;
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
      cells.push({
        day: d,
        dateKey: key,
        hasSessions,
        soldOut: hasSessions && sessions.every((s) => s.currentBookings >= s.maxCapacity),
        isToday: sameCalendarDay(date, new Date()),
        thumbnailUrl: hasSessions ? classImageFor(sessions[0].classType.name) : undefined,
      });
    }
    return cells;
  }, [calendarMonth, sessionsByDateKey]);

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  const reserve = (sessionId: string) =>
    setLocation(`/reserve?sessionId=${encodeURIComponent(sessionId)}&from=calendar`);

  const scrollCarousel = (dir: "left" | "right") => {
    const el = availCarouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -306 : 306, behavior: "smooth" });
  };

  const jumpToWeeklyDay = (dateKey: string) => {
    setView("grid");
    window.setTimeout(() => {
      const header = weeklyHeaderRefs.current.get(dateKey);
      if (!header) return;
      header.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightedDayKey(dateKey);
      window.setTimeout(() => setHighlightedDayKey((k) => (k === dateKey ? null : k)), 1600);
    }, 60);
  };

  return (
    <DashboardShell active="calendar">
      <PageContainer className="py-[clamp(20px,4vw,40px)] pb-24">
        {/* ===== HERO ===== */}
        <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[640px]">
            <h1 className="mb-2 font-display text-[clamp(26px,3.4vw,34px)] font-bold tracking-tight text-primary">
              Your Practice Schedule
            </h1>
            <p className="text-[clamp(15px,1.4vw,18px)] leading-relaxed text-dz-muted">
              Find your <span className="font-accent text-[1.16em] italic text-primary">flow</span>{" "}
              and book your next session — a curated calendar of mindful movement and healing
              sounds.
            </p>
          </div>
          <div className="flex gap-1.5 rounded-2xl border border-dz-glass-border bg-white/70 p-1.5 backdrop-blur-[20px]">
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors",
                  view === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-dz-muted hover:text-primary",
                )}
                data-testid={`calendar-view-${mode}`}
              >
                {mode === "grid" ? "Grid View" : "List View"}
              </button>
            ))}
          </div>
        </section>

        {/* ===== AVAILABLE TODAY ===== */}
        {(isLoading || filteredCarousel.length >= MIN_AVAILABLE_TODAY_CARDS) && (
          <GlassCard className="mb-6 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Available Today
                </h3>
                <span className="text-sm font-medium text-dz-muted">{todayLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-dz-muted">
                  Intensity
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(["All", ...CLASS_INTENSITIES] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setIntensity(value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        intensity === value
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-dz-muted hover:text-primary",
                      )}
                      data-testid={`intensity-${value}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
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
                  {filteredCarousel.map((cls) => {
                    const imageUrl = classImageFor(cls.classType.name);
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
                        intensityLabel={sessionIntensity(cls)}
                        onBook={(id) => reserve(id)}
                      />
                    );
                  })}
                  {filteredCarousel.length === 0 && (
                    <p className="py-12 text-center text-sm text-dz-muted">
                      No {intensity === "All" ? "" : `${intensity.toLowerCase()} `}sessions available
                      today.
                    </p>
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {error ? (
          <GlassCard className="p-10 text-center">
            <h2 className="font-display text-2xl font-bold text-destructive">
              Unable to load schedule
            </h2>
            <p className="mt-2 text-dz-muted">Please try again later.</p>
          </GlassCard>
        ) : view === "grid" ? (
          <div className="flex flex-wrap items-stretch gap-6">
            {/* ===== COMPACT CALENDAR ===== */}
            <GlassCard className="flex min-w-[min(100%,400px)] flex-1 flex-col p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg font-semibold">{monthLabel}</h3>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full text-dz-muted hover:bg-primary/5 hover:text-primary"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
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
                            cell.isToday ? "bg-primary font-semibold text-white" : "text-foreground",
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

            {/* ===== WEEKLY SCHEDULE ===== */}
            <GlassCard className="flex min-w-[min(100%,400px)] flex-1 flex-col p-4 md:p-6">
              <div className="mb-3.5 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Weekly Schedule</h3>
                <span className="text-xs font-medium text-dz-muted">Week {rollingWeek.weekNumber}</span>
              </div>
              <div className="max-h-[380px] flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="space-y-3 p-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : filteredDays.length > 0 ? (
                  filteredDays.map((day) => {
                    const dateKey = new Date(day.classes[0].date).toDateString();
                    return (
                      <div key={dateKey}>
                        <div
                          ref={(el) => {
                            if (el) weeklyHeaderRefs.current.set(dateKey, el);
                            else weeklyHeaderRefs.current.delete(dateKey);
                          }}
                          className={cn(
                            "sticky top-0 z-[1] border-b border-primary/5 bg-white/90 py-2 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm transition-colors",
                            highlightedDayKey === dateKey && "rounded-md bg-primary/10 px-2",
                          )}
                        >
                          {formatScheduleDayHeader(day.classes[0].date)}
                        </div>
                        {day.classes.map((cls) => {
                          const soldOut = cls.currentBookings >= cls.maxCapacity;
                          const badge = getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode);
                          return (
                            <div
                              key={cls.id}
                              className="flex items-center gap-3 border-b border-primary/5 py-2.5 last:border-0"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-dz-secondary text-xs font-bold text-white">
                                {instructorInitials(cls.instructor.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "font-display text-sm font-semibold",
                                    soldOut ? "text-dz-muted line-through" : "text-foreground",
                                  )}
                                >
                                  {cls.classType.name}
                                </div>
                                <div className="text-xs text-dz-muted">
                                  {formatTimeIST(cls.date)} · {cls.instructor.name}
                                </div>
                              </div>
                              {badge ? (
                                <Badge className="shrink-0 bg-primary text-white">{badge}</Badge>
                              ) : null}
                              <Button
                                size="sm"
                                className="shrink-0 rounded-lg bg-primary text-xs font-semibold"
                                disabled={soldOut}
                                onClick={() => reserve(cls.id)}
                                data-testid={`book-class-${cls.id}`}
                              >
                                {soldOut ? "Full" : "Book"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-dz-muted">
                    No upcoming classes match this filter.
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        ) : (
          /* ===== LIST VIEW ===== */
          <div className="flex flex-col gap-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredDays.length > 0 ? (
              filteredDays.map((day) => (
                <div key={new Date(day.classes[0].date).toDateString()}>
                  <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary">
                    <Sparkles className="h-4 w-4" />
                    {formatScheduleDayHeader(day.classes[0].date)}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {day.classes.map((cls) => {
                      const soldOut = cls.currentBookings >= cls.maxCapacity;
                      const badge = getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode);
                      const imageUrl = classImageFor(cls.classType.name);
                      return (
                        <GlassCard
                          key={cls.id}
                          className="flex flex-wrap items-center gap-4 p-4"
                        >
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-dz-secondary/30"
                            style={
                              imageUrl
                                ? {
                                    backgroundImage: `url(${imageUrl})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }
                                : undefined
                            }
                          />
                          <div className="min-w-[160px] flex-1">
                            <div className="mb-1 flex items-center gap-1 text-dz-secondary">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs font-semibold">{formatTimeIST(cls.date)}</span>
                            </div>
                            <h4
                              className={cn(
                                "font-display text-lg font-semibold",
                                soldOut ? "text-dz-muted line-through" : "text-foreground",
                              )}
                            >
                              {cls.classType.name}
                            </h4>
                            <p className="text-sm text-dz-muted">{cls.instructor.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {sessionIntensity(cls)}
                            </Badge>
                            {badge ? (
                              <Badge
                                variant="outline"
                                className={cn("whitespace-nowrap", SESSION_INFO_BADGE_CLASSNAME)}
                              >
                                {badge}
                              </Badge>
                            ) : null}
                          </div>
                          <span className="font-bold text-primary">₹{cls.classType.price}</span>
                          <Button
                            className="rounded-xl bg-primary font-semibold shadow-dz-primary hover:bg-primary/90"
                            disabled={soldOut}
                            onClick={() => reserve(cls.id)}
                            data-testid={`book-class-${cls.id}`}
                          >
                            {soldOut ? "Sold Out" : "Book Now"}
                          </Button>
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <GlassCard className="p-10 text-center">
                <p className="text-sm text-dz-muted">No upcoming classes match this filter.</p>
              </GlassCard>
            )}
          </div>
        )}
      </PageContainer>
    </DashboardShell>
  );
}
