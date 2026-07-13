import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  User as UserIcon,
  Flower2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { ImageHeroContent, ImageHeroScrim } from "@/components/digital-zen/image-hero-scrim";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getMeetJoinMessage,
  getMeetJoinState,
  getSessionEndTime,
} from "@shared/session-meet-access";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatSessionPrice } from "@/lib/booking-payment";
import {
  fetchMemberSessions,
  memberSessionsQueryKey,
  type MemberSession,
} from "@/lib/member-sessions";
import { MY_ACCOUNT_PROFILE_URL } from "@/lib/member-landing";
import { navigateToMemberReserve } from "@/lib/member-reserve-navigation";
import { consumeSpotReleasedFlag } from "@/lib/spot-release-navigation";
import { ReleaseSpotToast } from "@/components/release-spot-toast";
import { StrictNoToBlock } from "@/components/strict-no-to-block";
import type { ClassType, Instructor } from "@shared/schema";
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

/** Rotates once a day so the greeting stays fresh but stable within a session. */
const YOGA_QUOTES: { text: string; author: string }[] = [
  {
    text: "Yoga is the journey of the self, through the self, to the self.",
    author: "The Bhagavad Gita",
  },
  {
    text: "Yoga does not just change the way we see things, it transforms the person who sees.",
    author: "B.K.S. Iyengar",
  },
  { text: "Practice and all is coming.", author: "Sri K. Pattabhi Jois" },
  {
    text: "Yoga is not about touching your toes. It is about what you learn on the way down.",
    author: "Jigar Gor",
  },
  {
    text: "The body benefits from movement, and the mind benefits from stillness.",
    author: "Sakyong Mipham",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Will Durant",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  { text: "Inhale the future, exhale the past.", author: "Yoga proverb" },
  {
    text: "A little progress each day adds up to big results.",
    author: "Satya Nani",
  },
  {
    text: "When you own your breath, nobody can steal your peace.",
    author: "Yoga proverb",
  },
];

type PublicInstructor = Pick<Instructor, "id" | "name" | "bio" | "imageUrl" | "specialties">;

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatDayTime(date: string | Date): string {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}, ${formatTime(d)}`;
}

function scrollCarouselEl(el: HTMLDivElement | null, dir: number) {
  if (!el) return;
  el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 306), behavior: "smooth" });
}

function ClassTypeCard({
  classType,
  onBook,
}: {
  classType: ClassType;
  onBook: (classTypeId: string) => void;
}) {
  const price = formatSessionPrice(classType.price);

  return (
    <article
      className="flex w-[288px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border border-dz-glass-border bg-dz-glass/70 backdrop-blur-[20px] transition-transform hover:-translate-y-1 hover:shadow-dz-ambient"
      aria-label={classType.name}
      data-testid={`hub-workout-card-${classType.id}`}
    >
      <div className="relative flex h-[160px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#d7cfe6] to-[#c8bdd9]">
        {classType.imageUrl ? (
          <img
            src={classType.imageUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        ) : (
          <Flower2 className="h-16 w-16 text-primary/25" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <h3 className="font-display text-[19px] font-semibold text-primary">{classType.name}</h3>
          {price ? (
            <span className="whitespace-nowrap text-base font-bold text-primary">{price}</span>
          ) : null}
        </div>
        <div className="mb-[18px] flex gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Timer className="h-[17px] w-[17px]" />
            {classType.duration} min
          </span>
        </div>
        <StrictNoToBlock strictNoTo={classType.strictNoTo} compact className="mb-3 border-none pt-0" />
        <button
          type="button"
          onClick={() => onBook(classType.id)}
          className="mt-auto w-full rounded-xl border-[1.5px] border-primary/25 py-2.5 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          data-testid={`workout-book-${classType.id}`}
        >
          Book Now
        </button>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const workoutCarouselRef = useRef<HTMLDivElement>(null);
  const [heroImageIdx, setHeroImageIdx] = useState(0);
  const [showReleaseToast, setShowReleaseToast] = useState(() => consumeSpotReleasedFlag());
  const [now, setNow] = useState(() => new Date());

  const dailyQuote = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return YOGA_QUOTES[dayIndex % YOGA_QUOTES.length];
  }, []);

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

  // Re-evaluate join windows on a live clock so a session that ends while the
  // page is open stops showing the "Enter Session" LIVE control.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data: memberSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: memberSessionsQueryKey(user?.id ?? ""),
    queryFn: fetchMemberSessions,
    enabled: !!user?.id,
  });

  const { data: classTypes = [] } = useQuery<ClassType[]>({
    queryKey: ["/api/class-types"],
  });

  const { data: instructors = [] } = useQuery<PublicInstructor[]>({
    queryKey: ["/api/instructors"],
  });

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

  const heroSession = useMemo(() => {
    const isActiveNow = (s: MemberSession) =>
      getMeetJoinState({
        sessionStart: new Date(s.date),
        sessionDurationMinutes: s.sessionDurationMinutes ?? 60,
        isPaid: s.paymentStatus === "paid" || s.paymentStatus === "waived",
        hasMeetLink: !!s.googleMeetLink,
        now,
      }) === "active";

    // A session that is live right now takes priority.
    const live = upcomingBooked.find(isActiveNow);
    if (live) return live;

    // Otherwise show the soonest booked session that has not ended yet, so an
    // ended session never lingers in the hero as if it were still joinable.
    return upcomingBooked.find(
      (s) =>
        getSessionEndTime(new Date(s.date), s.sessionDurationMinutes ?? 60).getTime() >
        now.getTime(),
    );
  }, [upcomingBooked, now]);

  const bookClassType = (classTypeId: string) => {
    // classTypeId-only: anchor session is unknown until reserve resolves the
    // pool, so this falls back to reserve's on-mount fetch by design.
    navigateToMemberReserve(setLocation, queryClient, { classTypeId }, "dashboard");
  };

  const isLive =
    !!heroSession &&
    getMeetJoinState({
      sessionStart: new Date(heroSession.date),
      sessionDurationMinutes: heroSession.sessionDurationMinutes ?? 60,
      isPaid:
        heroSession.paymentStatus === "paid" || heroSession.paymentStatus === "waived",
      hasMeetLink: !!heroSession.googleMeetLink,
      now,
    }) === "active";

  return (
    <DashboardShell active="sessions">
      <PageContainer className="py-[clamp(20px,4vw,40px)] pb-24">
        {/* ===== HERO ===== */}
        <section className="mb-6">
          <div className="relative flex min-h-[clamp(320px,42vw,420px)] items-end overflow-hidden rounded-3xl border border-dz-glass-border shadow-dz-ambient lg:items-center">
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#e6dff1] via-[#d9d2ea] to-[#e7d8cd]" />
            <div className="absolute inset-0 z-[1] overflow-hidden lg:inset-y-0 lg:left-auto lg:w-[62%]">
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
            <ImageHeroScrim variant="light-side" />

            <ImageHeroContent
              glassOnMobile
              className="flex w-full max-w-[640px] flex-col items-start justify-end p-[clamp(24px,4vw,44px)] max-lg:min-h-[inherit] lg:max-w-[min(480px,42vw)] lg:justify-center"
            >
              <span className="mb-[18px] inline-block rounded-full bg-primary/10 px-4 py-[7px] text-[13px] font-semibold text-primary">
                {greeting()},{" "}
                <span className="font-accent text-[1.15em] italic">
                  {user?.name?.split(" ")[0] ?? "there"}
                </span>
              </span>
              <h1 className="mb-3.5 font-display text-[clamp(30px,5.4vw,46px)] font-bold leading-[1.12] tracking-tight text-primary">
                {dailyQuote.text}
              </h1>
              <p className="mb-4 text-[clamp(13px,1.3vw,15px)] font-semibold text-muted-foreground">
                <span className="font-accent text-[1.2em] italic">{dailyQuote.author}</span>
              </p>
              <p className="mb-6 max-w-[420px] text-[clamp(15px,1.4vw,18px)] leading-relaxed text-muted-foreground">
                {heroSession
                  ? isLive
                    ? `Your ${heroSession.className} session is live now. Tap Enter Session to join.`
                    : new Date(heroSession.date).toDateString() === now.toDateString()
                      ? `Your ${heroSession.className} session is scheduled today at ${formatTime(heroSession.date)}.`
                      : `Your next ${heroSession.className} session is ${formatDayTime(heroSession.date)}.`
                  : "No sessions scheduled for today. Explore our sessions below and reserve your spot."}
              </p>

              {heroSession ? (
                <div className="grid max-w-[440px] grid-cols-2 gap-3 rounded-[18px] border border-dz-glass-border bg-dz-surface/70 p-4 shadow-dz-ambient backdrop-blur-[16px]">
                  <div className="flex items-center gap-2.5 px-1 py-1.5">
                    <Timer className="h-5 w-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground">
                        TIME
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatTime(heroSession.date)}
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
                        {heroSession.instructorName}
                      </span>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isLive ? (
                        <a
                          href={heroSession.googleMeetLink ?? "#"}
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
                          aria-disabled="true"
                          onClick={(e) => e.preventDefault()}
                          className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground opacity-70"
                          data-testid="upcoming-session"
                        >
                          <CalendarClock className="h-4 w-4" />
                          <span>Upcoming Session</span>
                        </button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px] text-center">
                      {getMeetJoinMessage({
                        sessionStart: new Date(heroSession.date),
                        sessionDurationMinutes: heroSession.sessionDurationMinutes ?? 60,
                        isPaid:
                          heroSession.paymentStatus === "paid" ||
                          heroSession.paymentStatus === "waived",
                        hasMeetLink: !!heroSession.googleMeetLink,
                        now,
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
                        {heroSession.className}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/#schedule")}
                  className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-dz-primary transition-transform hover:-translate-y-0.5"
                >
                  Browse Schedule
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </ImageHeroContent>
          </div>
        </section>

        {/* ===== AND WE WORKOUT CAROUSEL ===== */}
        <section className="mb-14">
          <div className="mb-5">
            <h2 className="font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
              and We{" "}
              <span className="font-accent italic font-normal text-dz-secondary">Workout</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover the perfect class for your practice level and goals
            </p>
          </div>

          {classTypes.length === 0 ? (
            <GlassCard className="p-10 text-center text-muted-foreground">
              Class offerings are on the way. Please check back soon.
            </GlassCard>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => scrollCarouselEl(workoutCarouselRef.current, -1)}
                aria-label="Previous workout classes"
                className="absolute -left-2.5 top-[92px] z-[5] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/10 bg-dz-surface/90 text-primary shadow-dz-ambient backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarouselEl(workoutCarouselRef.current, 1)}
                aria-label="Next workout classes"
                className="absolute -right-2.5 top-[92px] z-[5] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/10 bg-dz-surface/90 text-primary shadow-dz-ambient backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div
                ref={workoutCarouselRef}
                className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto scroll-smooth px-0.5 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {classTypes.map((classType) => (
                  <ClassTypeCard key={classType.id} classType={classType} onBook={bookClassType} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== YOUR SCHEDULE ===== */}
        <section className="mb-14">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5">
            <h2 className="font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
              Your Schedule
            </h2>
            <button
              type="button"
              onClick={() => setLocation("/my-account#sessions")}
              disabled={upcomingBooked.length === 0}
              aria-disabled={upcomingBooked.length === 0}
              className={cn(
                "flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:underline",
                upcomingBooked.length === 0 && "pointer-events-none opacity-50",
              )}
            >
              <CalendarCheck className="h-[18px] w-[18px]" />
              View All bookings
            </button>
          </div>
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
        </section>

        {/* ===== YOUR MENTORS ===== */}
        <section className="mb-14">
          <h2 className="mb-5 font-display text-[clamp(24px,3vw,32px)] font-bold text-primary">
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
        </section>
      </PageContainer>
      <ReleaseSpotToast visible={showReleaseToast} />
    </DashboardShell>
  );
}
