import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  PlayCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import evolveCarousel from "@assets/evolve-carousel.png";
import embraceCarousel from "@assets/embrace-carousel.png";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import hyyocrossImg from "@assets/Hyyocross_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";
import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import priyaImg from "@assets/priya sharma_1756814809753.jpg";
import arjunImg from "@assets/arjunpatel_1756814809753.jpg";
import alliceImg from "@assets/allice kumari_1756814809753.jpg";

const TOPICS = [
  { label: "Vinyasa", tone: "bg-dz-secondary/15 text-dz-secondary" },
  { label: "Hatha", tone: "bg-emerald-600/15 text-emerald-700" },
  { label: "Mindfulness", tone: "bg-primary/10 text-primary" },
  { label: "Yoga Therapy", tone: "bg-muted text-foreground" },
];

const TRENDS = [
  { title: "Daily Centering", tag: "Meditation", badge: "15 MIN", blurb: "A quick session to find focus amidst a busy digital day.", image: meditationImg },
  { title: "Connection Asanas", tag: "Workshop", badge: "NEW", blurb: "Explore the geometry of balance in this intermediate partner flow.", image: hyyocrossImg },
];

const INSTRUCTORS = [
  { name: "Priya Sharma", focus: "Vinyasa Specialist", rating: "4.9", students: "2k+", image: priyaImg, ring: "ring-primary/30" },
  { name: "Arjun Patel", focus: "Yin Yoga & Breathwork", rating: "5.0", students: "1.5k", image: arjunImg, ring: "ring-dz-secondary/40" },
  { name: "Allice Kumari", focus: "Hatha & Alignment", rating: "4.8", students: "4k", image: alliceImg, ring: "ring-emerald-500/40" },
];

const ARTICLES = [
  { tag: "Mindfulness", title: "Morning Rituals: Beyond the Mat", blurb: "How to integrate yoga philosophy into your daily routine for better mental clarity.", meta: "5 min read • by Sarah Miller", image: embraceCarousel },
  { tag: "Nutrition", title: "Fueling Flow: Post-Practice Meals", blurb: "Why protein timing matters and three simple recipes that take under ten minutes to prep.", meta: "8 min read • by Dr. James Kahn", image: soundtherapyImg },
];

const PICKS = [
  { title: "Restorative Nighttime Yoga", note: "Based on your sleep logs", image: meditationImg },
  { title: "Core Integrity Bootcamp", note: "Matches your goal: Core Strength", image: hyyocrossImg },
  { title: "Pranayama for Stress", note: "Popular in your location", image: soundtherapyImg },
  { title: "Yoga Sutras Study", note: "Because you liked Origins", image: hathaYogaImg },
];

export default function Explore() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const scrollSlider = (dir: "left" | "right") =>
    sliderRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });

  return (
    <DashboardShell active="explore">
      <PageContainer className="py-[clamp(20px,4vw,40px)] pb-24">
        {/* ===== HERO ===== */}
        <section className="mb-10 rounded-3xl bg-gradient-to-br from-primary/5 via-dz-secondary/5 to-transparent px-6 py-12 text-center">
          <h1 className="mb-3 font-display text-[clamp(28px,4.5vw,48px)] font-bold tracking-tight text-primary">
            Find your <span className="font-accent italic font-normal text-dz-secondary">flow</span>.
          </h1>
          <p className="mx-auto mb-7 max-w-2xl text-[clamp(15px,1.5vw,18px)] leading-relaxed text-dz-muted">
            Discover curated wellness journeys designed for your unique path — from deep meditation
            to high-energy flow.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => toast({ title: t.label, description: "Curated collections are coming soon." })}
                className={cn("rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-80", t.tone)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* ===== TRENDING BENTO ===== */}
        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold text-primary">Trending Now</h2>
            <button
              type="button"
              onClick={() => toast({ title: "Trending", description: "Full catalogue coming soon." })}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {/* Large feature */}
            <div className="group relative col-span-1 row-span-2 cursor-pointer overflow-hidden rounded-2xl border border-dz-glass-border shadow-dz-ambient transition hover:shadow-dz-hero md:col-span-2">
              <img
                src={evolveCarousel}
                alt="Lunar Awakening Flow"
                className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-[480px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <span className="mb-3 inline-block rounded-md bg-dz-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                  Masterclass
                </span>
                <h3 className="mb-1.5 font-display text-2xl font-semibold">Lunar Awakening Flow</h3>
                <p className="mb-4 max-w-md text-sm text-white/90">
                  Join Elena Rose for a transformative 75-minute session focused on fluid movement
                  and breath connection.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => toast({ title: "Lunar Awakening Flow", description: "On-demand library is coming soon." })}
                    className="bg-white text-primary hover:bg-white/90"
                  >
                    <PlayCircle className="mr-2 h-5 w-5" /> Watch Now
                  </Button>
                  <span className="text-sm font-medium">1.2k attending</span>
                </div>
              </div>
            </div>

            {/* Secondary trends */}
            {TRENDS.map((t) => (
              <div
                key={t.title}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-dz-glass-border bg-white/70 shadow-dz-ambient backdrop-blur-[20px] transition hover:-translate-y-1"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <span className="absolute right-2 top-2 rounded bg-white/85 px-2 py-1 text-[10px] font-bold text-primary backdrop-blur">
                    {t.badge}
                  </span>
                </div>
                <div className="p-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-dz-secondary">
                    {t.tag}
                  </p>
                  <h4 className="mb-1 font-display text-lg font-semibold text-foreground">{t.title}</h4>
                  <p className="line-clamp-2 text-sm text-dz-muted">{t.blurb}</p>
                </div>
              </div>
            ))}

            {/* AI assessment card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dz-glass-border bg-gradient-to-br from-primary/5 via-dz-secondary/10 to-primary/5 p-6 text-center shadow-dz-ambient lg:col-span-2">
              <Sparkles className="mb-3 h-11 w-11 text-primary" />
              <h4 className="mb-1.5 font-display text-xl font-semibold text-primary">Custom practice?</h4>
              <p className="mb-5 text-sm text-dz-muted">
                Let our guide build a sequence based on your current energy levels.
              </p>
              <Button
                onClick={() => toast({ title: "Practice assessment", description: "Personalized sequencing is coming soon." })}
              >
                Start Assessment
              </Button>
            </div>
          </div>
        </section>

        {/* ===== INSTRUCTORS ===== */}
        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold text-primary">Instructor Spotlights</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollSlider("left")}
                aria-label="Previous"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-dz-glass-border bg-white/70 text-primary transition hover:bg-primary hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollSlider("right")}
                aria-label="Next"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-dz-glass-border bg-white/70 text-primary transition hover:bg-primary hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div ref={sliderRef} className="scrollbar-hide -mx-1 flex gap-5 overflow-x-auto px-1 pb-2">
            {INSTRUCTORS.map((ins) => (
              <div
                key={ins.name}
                className="flex w-72 shrink-0 flex-col items-center rounded-3xl border border-dz-glass-border bg-white/70 p-6 text-center shadow-dz-ambient backdrop-blur-[20px] transition hover:-translate-y-2"
              >
                <div className={cn("mb-4 h-28 w-28 overflow-hidden rounded-full ring-4", ins.ring)}>
                  <img src={ins.image} alt={ins.name} className="h-full w-full object-cover" />
                </div>
                <h5 className="font-display text-lg font-semibold text-primary">{ins.name}</h5>
                <p className="mb-4 text-sm font-medium text-dz-secondary">{ins.focus}</p>
                <div className="mb-5 flex items-center gap-6">
                  <div>
                    <p className="font-bold text-primary">{ins.rating}</p>
                    <p className="text-[10px] uppercase tracking-tight text-dz-muted">Rating</p>
                  </div>
                  <div className="h-8 w-px bg-dz-glass-border" />
                  <div>
                    <p className="font-bold text-primary">{ins.students}</p>
                    <p className="text-[10px] uppercase tracking-tight text-dz-muted">Students</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast({ title: ins.name, description: "Instructor profiles are coming soon." })}
                >
                  View Profile
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* ===== JOURNAL ===== */}
        <section className="mb-12">
          <h2 className="mb-5 font-display text-2xl font-semibold text-primary">The Wellness Journal</h2>
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            {ARTICLES.map((a) => (
              <button
                key={a.title}
                type="button"
                onClick={() => toast({ title: a.title, description: "The journal launches soon." })}
                className="group flex flex-col gap-4 text-left md:flex-row"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl md:w-1/2">
                  <img
                    src={a.image}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-center md:w-1/2">
                  <span className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-dz-secondary">
                    {a.tag}
                  </span>
                  <h3 className="mb-2 font-display text-xl font-semibold text-primary transition-colors group-hover:text-dz-secondary">
                    {a.title}
                  </h3>
                  <p className="mb-2 text-sm text-dz-muted">{a.blurb}</p>
                  <p className="text-xs text-dz-muted">{a.meta}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ===== PERSONALIZED PICKS ===== */}
        <section>
          <h2 className="mb-5 font-display text-2xl font-semibold text-primary">Personalized Picks</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {PICKS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => toast({ title: p.title, description: "Recommendations are coming soon." })}
                className="group rounded-2xl border border-dz-glass-border bg-white/70 p-3 text-left shadow-dz-ambient backdrop-blur-[20px] transition hover:-translate-y-1"
              >
                <div className="mb-3 aspect-square overflow-hidden rounded-xl">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <h6 className="line-clamp-1 text-sm font-semibold text-primary">{p.title}</h6>
                <p className="flex items-center gap-1 text-[11px] text-dz-muted">
                  {p.note}
                  <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                </p>
              </button>
            ))}
          </div>
        </section>
      </PageContainer>
    </DashboardShell>
  );
}
