import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  User as UserIcon,
  Flower2,
  Flame,
  CalendarCheck,
  Stars,
  CalendarDays,
  ArrowRight,
  Video,
  GraduationCap,
  Mountain,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMeetJoinMessage } from "@shared/session-meet-access";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatSessionPrice } from "@/lib/booking-payment";
import { PUBLIC_SESSION_CATALOG_QUERY_OPTIONS } from "@/lib/public-session-catalog";
import {
  collapseBookableForCarousel,
  formatHubCarouselSchedule,
} from "@/lib/hub-carousel-sessions";
import { getSessionBadgeLabel } from "@/lib/session-badges";
import {
  fetchMemberSessions,
  memberSessionsQueryKey,
  type MemberSession,
} from "@/lib/member-sessions";
import { MY_ACCOUNT_PROFILE_URL } from "@/lib/member-landing";
import { consumeSpotReleasedFlag } from "@/lib/spot-release-navigation";
import { ReleaseSpotToast } from "@/components/release-spot-toast";
import { StrictNoToBlock } from "@/components/strict-no-to-block";
import type { Class, ClassType, Instructor } from "@shared/schema";
import embraceImage from "@assets/embrace-carousel.png";
import experienceImage from "@assets/experience_1756460037530.jpg";
import expressImage from "@assets/express_1756460037530.jpg";
import evolveImage from "@assets/evolve-carousel.png";
import elevateImage from "@assets/elevate-carousel.png";
import becomeImage from "@assets/become-carousel.png";

const HERO_IMAGES = [
  embraceImage,
  experienceImage,
  expressImage,
  evolveImage,
  elevateImage,
  becomeImage,
];

interface EnrichedClass extends Class {
  classType: ClassType;
  instructor: { id: string; name: string };
  hasPaymentConfigured?: boolean;
}

type PublicInstructor = Pick<Instructor, "id" | "name" | "bio" | "imageUrl" | "specialties">;

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDayTime(date: string | Date): string {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })}, ${formatTime(d)}`;
}

/** Consecutive-day streak ending today/yesterday across attended sessions. */
function wellnessStreak(completed: MemberSession[], now = new Date()): number {
  const days = new Set(
    completed.map((s) => new Date(s.date).toDateString()),
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(now);
  // Allow the streak to count even if today has no session yet (start from today).
  for (let i = 0; i < 400; i += 1) {
    if (days.has(cursor.toDateString())) {
      streak += 1;
    } else if (streak > 0) {
      break;
    } else if (i > 1) {
      // no session today or yesterday → no active streak
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  unit?: string;
  accent: string;
}) {
  return (
    <GlassCard
      className="flex items-center gap-[18px] rounded-[18px] p-[22px] transition-transform hover:-translate-y-[3px]"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <span
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}1a`, color: accent }}
      >
        <Icon className="h-[26px] w-[26px]" />
      </span>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </p>
        <h3 className="font-display text-2xl font-bold text-primary">
          {value}{" "}
          {unit ? <span className="text-sm font-normal text-muted-foreground">{unit}</span> : null}
        </h3>
      </div>
    </GlassCard>
  );
}

function SessionCard({
  cls,
  onReserve,
}: {
  cls: EnrichedClass;
  onReserve: (cls: EnrichedClass) => void;
}) {
  const price = formatSessionPrice(cls.classType.price);
  const badge = getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode);
  const schedule = formatHubCarouselSchedule(cls);
  const imageChipClass =
    "rounded-lg border border-black/[0.08] bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.18)]";

  return (
    <article
      className="flex w-[288px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border border-dz-glass-border bg-dz-glass/70 backdrop-blur-[20px] transition-transform hover:-translate-y-1 hover:shadow-dz-ambient"
      aria-label={`${cls.classType.name}, ${schedule.label}`}
      data-testid={`hub-session-card-${cls.id}`}
    >
      <div className="relative flex h-[160px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#d7cfe6] to-[#c8bdd9]">
        {cls.classType.imageUrl ? (
          <img
            src={cls.classType.imageUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        ) : (
          <Flower2 className="h-16 w-16 text-primary/25" aria-hidden />
        )}
        {badge ? (
          <span className={cn("absolute left-3 top-3", imageChipClass)}>{badge}</span>
        ) : null}
        <span className={cn("absolute right-3 top-3", imageChipClass)}>
          {cls.currentBookings}/{cls.maxCapacity} spots
        </span>
        {schedule.label ? (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-black/[0.08] bg-white px-3.5 py-2.5 text-[12px] font-semibold leading-snug text-foreground shadow-[0_-6px_16px_rgba(0,0,0,0.12)]"
            data-testid={`hub-session-schedule-${cls.id}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <span className="truncate">{schedule.label}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <h3 className="font-display text-[19px] font-semibold text-primary">
            {cls.classType.name}
          </h3>
          {price ? (
            <span className="whitespace-nowrap text-base font-bold text-primary">{price}</span>
          ) : null}
        </div>
        <div className="mb-[18px] flex gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Timer className="h-[17px] w-[17px]" />
            {cls.classType.duration} min
          </span>
          <span className="flex items-center gap-1.5">
            <UserIcon className="h-[17px] w-[17px]" />
            {cls.instructor.name}
          </span>
        </div>
        <StrictNoToBlock strictNoTo={cls.classType.strictNoTo} compact className="mb-3 border-none pt-0" />
        <button
          type="button"
          onClick={() => onReserve(cls)}
          className="mt-auto w-full rounded-xl border-[1.5px] border-primary/25 py-2.5 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          data-testid={`reserve-${cls.id}`}
        >
          Reserve Spot
        </button>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [heroImageIdx, setHeroImageIdx] = useState(0);
  const [showReleaseToast, setShowReleaseToast] = useState(() => consumeSpotReleasedFlag());

  useEffect(() => {
    if (!showReleaseToast) return;
    const id = window.setTimeout(() => setShowReleaseToast(false), 2500);
    return () => window.clearTimeout(id);
  }, [showReleaseToast]);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.profileCompletionStatus === "incomplete") {
      setLocation(MY_ACCOUNT_PROFILE_URL);
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    const id = window.setInterval(
      () => setHeroImageIdx((i) => (i + 1) % HERO_IMAGES.length),
      4500,
    );
    return () => window.clearInterval(id);
  }, []);

  const { data: memberSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: memberSessionsQueryKey(user?.id ?? ""),
    queryFn: fetchMemberSessions,
    enabled: !!user?.id,
  });

  const { data: allClasses = [] } = useQuery<EnrichedClass[]>({
    queryKey: ["/api/classes"],
    ...PUBLIC_SESSION_CATALOG_QUERY_OPTIONS,
  });

  const { data: instructors = [] } = useQuery<PublicInstructor[]>({
    queryKey: ["/api/instructors"],
  });

  const bookable = useMemo(() => collapseBookableForCarousel(allClasses, 12), [allClasses]);

  const upcomingBooked = useMemo(
    () =>
      memberSessions
        .filter(
          (s) =>
            s.status === "upcoming" &&
            (s.paymentStatus === "paid" || s.paymentStatus === "waived"),
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [memberSessions],
  );

  const completed = useMemo(
    () => memberSessions.filter((s) => s.status === "completed"),
    [memberSessions],
  );

  const todaySession = useMemo(() => {
    const today = new Date().toDateString();
    const live = upcomingBooked.find((s) => s.meetJoinState === "active");
    if (live) return live;
    return upcomingBooked.find((s) => new Date(s.date).toDateString() === today);
  }, [upcomingBooked]);

  const attendedThisMonth = useMemo(() => {
    const now = new Date();
    return completed.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [completed]);

  const streak = useMemo(() => wellnessStreak(completed), [completed]);

  const reserve = (cls: EnrichedClass) => {
    setLocation(`/reserve?sessionId=${encodeURIComponent(cls.id)}&from=dashboard`);
  };

  const scrollCarousel = (dir: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 306), behavior: "smooth" });
  };

  const isLive = todaySession?.meetJoinState === "active" && !!todaySession.googleMeetLink;

  return (
    <DashboardShell active="sessions">
      <PageContainer className="py-[clamp(20px,4vw,40px)] pb-24">
        {/* ===== HERO ===== */}
        <section className="mb-6">
          <div className="relative flex min-h-[clamp(320px,42vw,420px)] items-center overflow-hidden rounded-3xl border border-dz-glass-border shadow-dz-ambient">
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#e6dff1] via-[#d9d2ea] to-[#e7d8cd]" />
            <div className="absolute inset-y-0 right-0 z-[1] w-[62%] overflow-hidden">
              {HERO_IMAGES.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  aria-hidden
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out",
                    i === heroImageIdx ? "opacity-100" : "opacity-0",
                  )}
                />
              ))}
            </div>
            <div className="absolute inset-0 z-[2] bg-gradient-to-r from-dz-surface via-dz-surface/85 to-transparent" />

            <div className="relative z-[3] w-full max-w-[640px] p-[clamp(24px,4vw,44px)]">
              <span className="mb-[18px] inline-block rounded-full bg-primary/10 px-4 py-[7px] text-[13px] font-semibold text-primary">
                {greeting()},{" "}
                <span className="font-accent text-[1.15em] italic">
                  {user?.name?.split(" ")[0] ?? "there"}
                </span>
              </span>
              <h1 className="mb-3.5 font-display text-[clamp(30px,5.4vw,46px)] font-bold leading-[1.12] tracking-tight text-primary">
                Your sanctuary for
                <br />
                <span className="font-accent text-[1.06em] font-normal italic">mindful</span> movement.
              </h1>
              <p className="mb-6 max-w-[420px] text-[clamp(15px,1.4vw,18px)] leading-relaxed text-muted-foreground">
                {todaySession
                  ? `Your ${todaySession.className} session is scheduled today at ${formatTime(todaySession.date)}.`
                  : "No sessions scheduled for today. Explore upcoming sessions below and reserve your spot."}
              </p>

              {todaySession ? (
                <div className="grid max-w-[440px] grid-cols-2 gap-3 rounded-[18px] border border-dz-glass-border bg-dz-surface/70 p-4 shadow-dz-ambient backdrop-blur-[16px]">
                  <div className="flex items-center gap-2.5 px-1 py-1.5">
                    <Timer className="h-5 w-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground">
                        TIME
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatTime(todaySession.date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-1 py-1.5">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground">
                        INSTRUCTOR
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {todaySession.instructorName}
                      </span>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isLive ? (
                        <a
                          href={todaySession.googleMeetLink ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-dz-primary transition-transform hover:-translate-y-0.5"
                          data-testid="enter-session"
                        >
                          <span>Enter Session</span>
                          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#ff6b6b]" />
                          <span className="text-[10px] font-bold tracking-wider">LIVE</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLocation("/my-account#sessions")}
                          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-dz-primary transition-transform hover:-translate-y-0.5"
                          data-testid="view-session"
                        >
                          <Video className="h-4 w-4" />
                          <span>View Session</span>
                        </button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px] text-center">
                      {getMeetJoinMessage({
                        sessionStart: new Date(todaySession.date),
                        sessionDurationMinutes: todaySession.sessionDurationMinutes ?? 60,
                        isPaid:
                          todaySession.paymentStatus === "paid" ||
                          todaySession.paymentStatus === "waived",
                        hasMeetLink: !!todaySession.googleMeetLink,
                      })}
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-2.5 px-1 py-1.5">
                    <Flower2 className="h-5 w-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground">
                        TYPE
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {todaySession.className}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/#schedule")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-dz-primary transition-transform hover:-translate-y-0.5"
                >
                  Browse Schedule
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="mb-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            icon={CalendarCheck}
            label="Sessions Attended"
            value={attendedThisMonth}
            unit="this month"
            accent="#34196a"
          />
          <StatTile
            icon={Flame}
            label="Upcoming Booked"
            value={upcomingBooked.length}
            unit={upcomingBooked.length === 1 ? "session" : "sessions"}
            accent="#9a4612"
          />
          <StatTile
            icon={Stars}
            label="Wellness Streak"
            value={streak}
            unit={streak === 1 ? "day" : "days"}
            accent="#354c3a"
          />
        </section>

        {/* ===== UPCOMING SESSIONS CAROUSEL ===== */}
        <section className="mb-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3.5">
            <div>
              <h2 className="font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
                Upcoming Sessions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reserve your spot in our open sessions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/my-account#sessions")}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <CalendarCheck className="h-[18px] w-[18px]" />
              View Booked
            </button>
          </div>

          {bookable.length === 0 ? (
            <GlassCard className="p-10 text-center text-muted-foreground">
              No open sessions right now. Please check back soon.
            </GlassCard>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                aria-label="Previous sessions"
                className="absolute -left-2.5 top-[92px] z-[5] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/10 bg-dz-surface/90 text-primary shadow-dz-ambient backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                aria-label="Next sessions"
                className="absolute -right-2.5 top-[92px] z-[5] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/10 bg-dz-surface/90 text-primary shadow-dz-ambient backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div
                ref={carouselRef}
                className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto scroll-smooth px-0.5 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {bookable.map((cls) => (
                  <SessionCard key={cls.id} cls={cls} onReserve={reserve} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== MENTORS + YOUR SCHEDULE ===== */}
        <section className="mb-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-[18px]">
            <h2 className="font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
              Your Mentors
            </h2>
            <div className="flex flex-col gap-3.5">
              {instructors.slice(0, 4).map((mentor) => (
                <GlassCard
                  key={mentor.id}
                  className="flex items-center gap-3.5 rounded-2xl p-3.5 transition-transform hover:translate-x-1.5"
                >
                  <div className="flex h-[54px] w-[54px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary via-[#4b3282] to-dz-secondary font-display text-lg font-bold text-white">
                    {mentor.imageUrl ? (
                      <img
                        src={mentor.imageUrl}
                        alt={mentor.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      mentor.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-base font-semibold text-primary">
                      {mentor.name}
                    </h4>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {mentor.specialties?.[0] ?? mentor.bio ?? "andWeYoga Instructor"}
                    </p>
                  </div>
                </GlassCard>
              ))}
              {instructors.length === 0 && (
                <GlassCard className="p-6 text-center text-sm text-muted-foreground">
                  Mentor profiles are on the way.
                </GlassCard>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[18px]">
            <h2 className="font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
              Your Schedule
            </h2>
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#4b3282] to-primary p-[26px]">
              <div className="relative z-[1]">
                <p className="mb-5 text-sm leading-relaxed text-white/80">
                  {sessionsLoading
                    ? "Loading your booked sessions…"
                    : upcomingBooked.length === 0
                      ? "You have no upcoming booked sessions yet."
                      : `You have ${upcomingBooked.length} session${upcomingBooked.length === 1 ? "" : "s"} scheduled.`}
                </p>
                <div className="flex flex-col gap-2.5">
                  {upcomingBooked.slice(0, 4).map((s) => (
                    <button
                      key={s.bookingId}
                      type="button"
                      onClick={() => setLocation("/my-account#sessions")}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.18]"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{s.className}</div>
                        <div className="text-[11px] text-white/70">{formatDayTime(s.date)}</div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-white" />
                    </button>
                  ))}
                  {!sessionsLoading && upcomingBooked.length === 0 && (
                    <button
                      type="button"
                      onClick={() => (window.location.href = "/#schedule")}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                    >
                      Find a session
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <CalendarDays className="absolute -bottom-8 -right-8 h-[170px] w-[170px] rotate-12 text-white/[0.08]" />
            </div>
          </div>
        </section>

        {/* ===== COMING SOON ===== */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <GlassCard className="flex flex-col justify-between rounded-[22px] p-[30px]">
            <div>
              <div className="mb-[22px] flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-dz-secondary/10 text-dz-secondary">
                  <GraduationCap className="h-[25px] w-[25px]" />
                </span>
                <span className="rounded-md bg-dz-secondary/10 px-2.5 py-1 text-[11px] font-bold tracking-[0.1em] text-dz-secondary">
                  COMING SOON
                </span>
              </div>
              <h3 className="mb-3 font-display text-[26px] font-bold text-primary">
                Workshops &amp; Events
              </h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Curated intensive sessions for deep technical mastery and spiritual growth. Stay
                tuned for our inaugural schedule.
              </p>
            </div>
          </GlassCard>
          <GlassCard className="flex flex-col justify-between rounded-[22px] p-[30px]">
            <div>
              <div className="mb-[22px] flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                  <Mountain className="h-[25px] w-[25px]" />
                </span>
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-bold tracking-[0.1em] text-primary">
                  COMING SOON
                </span>
              </div>
              <h3 className="mb-3 font-display text-[26px] font-bold text-primary">Trips &amp; Treks</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Immersive wellness retreats in the world's most serene natural landscapes. Launching
                soon.
              </p>
            </div>
          </GlassCard>
        </section>
      </PageContainer>
      <ReleaseSpotToast visible={showReleaseToast} />
    </DashboardShell>
  );
}
