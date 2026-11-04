import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AvailableTodayLayout } from "@/components/available-today-session-card";
import { filterUpcomingScheduleDays } from "@/lib/booking-flow";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import hyyocrossImg from "@assets/Hyyocross_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";
import { AvailableTodaySessionCard } from "@/components/available-today-session-card";
import { PUBLIC_SESSION_CATALOG_QUERY_OPTIONS } from "@/lib/public-session-catalog";
import { isFlexiEnabledSchedule } from "@shared/flexi-mode";

interface ClassType {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
  strictNoTo?: string | null;
}

interface ScheduleDay {
  day: string;
  date: Date;
  classes: Array<{
    id: string;
    classTypeId: string;
    instructorId: string;
    date: Date;
    classType: ClassType;
    instructor: { id: string; name: string };
    currentBookings: number;
    maxCapacity: number;
    sessionFrequency?: string | null;
    deliveryMode?: string | null;
    recurrenceKind?: string | null;
    seriesId?: string | null;
    flexiEnabled?: boolean | null;
  }>;
}

interface ScheduleSectionProps {
  onBookingClick: (classId?: string) => void;
}

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

export default function ScheduleSection({ onBookingClick }: ScheduleSectionProps) {
  const availCarouselRef = useRef<HTMLDivElement>(null);

  const { data: weeklySchedule, isLoading, error } = useQuery<ScheduleDay[]>({
    queryKey: ["/api/schedule/week"],
    ...PUBLIC_SESSION_CATALOG_QUERY_OPTIONS,
  });

  const { data: promotions } = useQuery<
    Array<{ promotionId: string; position: number; session: ScheduleDay["classes"][number] }>
  >({
    queryKey: ["/api/carousel/promotions"],
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const upcomingSchedule = useMemo(
    () => (weeklySchedule ? filterUpcomingScheduleDays(weeklySchedule) : []),
    [weeklySchedule],
  );

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

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

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

  if (isLoading || carouselSessions.length === 0) return null;

  const layout: AvailableTodayLayout =
    carouselSessions.length === 1 ? "feature" : carouselSessions.length === 2 ? "pair" : "carousel";

  const cards = carouselSessions.map((cls) => (
    <AvailableTodaySessionCard
      key={cls.id}
      sessionId={cls.id}
      className={cls.classType.name}
      instructorName={cls.instructor.name}
      timeLabel={formatTimeIST(cls.date)}
      price={cls.classType.price}
      imageUrl={classImageFor(cls.classType)}
      soldOut={cls.currentBookings >= cls.maxCapacity}
      strictNoTo={cls.classType.strictNoTo}
      flexiEnabled={isFlexiEnabledSchedule(cls)}
      layout={layout}
      onBook={(id) => onBookingClick(id)}
    />
  ));

  return (
    <section id="schedule" className="relative bg-dz-surface py-12 md:py-20" data-testid="available-today">
      <PageContainer className="relative">
        <GlassCard className="p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2.5">
              <h3 className="font-display text-xl font-semibold text-foreground">Available Today</h3>
              <span className="text-sm font-medium text-dz-muted">{todayLabel}</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              {carouselSessions.length} live session{carouselSessions.length === 1 ? "" : "s"}
            </span>
          </div>

          {layout === "carousel" ? (
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
                {cards}
              </div>
            </div>
          ) : (
            <div className={layout === "pair" ? "flex flex-col gap-4 md:flex-row" : undefined}>{cards}</div>
          )}
        </GlassCard>
      </PageContainer>
    </section>
  );
}
