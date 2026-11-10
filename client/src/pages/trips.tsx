import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  MapPin,
  CheckCircle2,
  ArrowRight,
  Waves,
  Mountain,
  Sparkles,
  Trees,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import evolveImg from "@assets/evolve_1756461197648.jpg";
import experienceImg from "@assets/experience_1756460037530.jpg";
import endureImg from "@assets/endure_1756460037530.jpg";

export default function Trips() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const soon = (title: string) =>
    toast({ title, description: "Trip bookings open soon. We'll let you know." });

  return (
    <DashboardShell active="trips">
      <PageContainer className="relative py-[clamp(20px,4vw,40px)] pb-24">
        {/* Ambient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-10 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/2 -z-10 h-72 w-72 rounded-full bg-dz-secondary/10 blur-3xl"
        />

        {/* ===== HERO ===== */}
        <section className="mb-10 py-6 text-center">
          <span className="mb-4 inline-block rounded-full bg-dz-secondary/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-dz-secondary">
            Soulful Journeys
          </span>
          <h1 className="mb-4 font-display text-[clamp(28px,4.5vw,48px)] font-bold tracking-tight text-primary">
            Beyond the mat: <span className="font-accent italic font-normal text-dz-secondary">trips & treks</span>
          </h1>
          <p className="mx-auto max-w-2xl text-[clamp(15px,1.5vw,18px)] leading-relaxed text-dz-muted">
            Discover transformative retreats in the world's most sacred spaces. Join our global
            community as we explore internal stillness through external exploration.
          </p>
        </section>

        {/* ===== BENTO GRID ===== */}
        <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Himalayan — large */}
          <div className="group overflow-hidden rounded-2xl border border-dz-glass-border bg-white/70 shadow-dz-ambient backdrop-blur-[20px] transition hover:shadow-dz-hero md:col-span-8">
            <div className="grid h-full grid-cols-1 md:grid-cols-2">
              <div className="relative h-72 overflow-hidden md:h-full">
                <img
                  src={evolveImg}
                  alt="Himalayan Zen Retreat"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              </div>
              <div className="flex flex-col justify-center p-7">
                <h2 className="mb-1.5 font-display text-2xl font-semibold text-primary">
                  Himalayan Zen Retreat
                </h2>
                <div className="mb-4 flex items-center gap-1.5 text-dz-secondary">
                  <MapPin className="h-[18px] w-[18px]" />
                  <span className="text-sm font-medium">Rishikesh, India</span>
                </div>
                <ul className="mb-6 space-y-2.5">
                  {[
                    "10 days of guided meditation",
                    "High-altitude trekking trails",
                    "Ayurvedic plant-based dining",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-dz-muted">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => soon("Himalayan Zen Retreat")} className="group/btn w-full md:w-fit">
                  Explore Journey
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Coastal — side */}
          <div className="group flex flex-col overflow-hidden rounded-2xl border border-dz-glass-border bg-white/70 shadow-dz-ambient backdrop-blur-[20px] transition hover:shadow-dz-hero md:col-span-4">
            <div className="relative h-60 overflow-hidden">
              <img
                src={experienceImg}
                alt="Coastal Yoga & Surf Camp"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-display text-xl font-semibold text-primary">
                  Coastal Yoga & Surf Camp
                </h3>
                <span className="shrink-0 rounded bg-dz-secondary/15 px-2 py-0.5 text-xs font-semibold text-dz-secondary">
                  7 Days
                </span>
              </div>
              <p className="mb-5 flex-1 text-sm text-dz-muted">
                Find your flow on the waves and the mat. A perfect balance of adventure and
                mindfulness in Portugal's hidden gems.
              </p>
              <Button variant="outline" onClick={() => soon("Coastal Yoga & Surf Camp")} className="w-full">
                View Itinerary
                <Waves className="ml-2 h-[18px] w-[18px]" />
              </Button>
            </div>
          </div>

          {/* Forest — long */}
          <div className="group overflow-hidden rounded-2xl border border-dz-glass-border bg-white/70 shadow-dz-ambient backdrop-blur-[20px] transition hover:shadow-dz-hero md:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="flex flex-col justify-center p-7">
                <h2 className="mb-1.5 font-display text-2xl font-semibold text-primary">
                  Spiritual Forest Trek
                </h2>
                <p className="mb-5 text-sm text-dz-muted">
                  A deep immersion into the ancient forests of Japan. Connect with nature through
                  Shinrin-yoku (forest bathing) and sunrise yoga.
                </p>
                <div className="mb-6 flex gap-5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Next Date
                    </span>
                    <span className="font-display text-xl font-semibold text-dz-secondary">Oct 12</span>
                  </div>
                  <div className="w-px bg-dz-glass-border" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Spaces Left
                    </span>
                    <span className="font-display text-xl font-semibold text-dz-secondary">4 only</span>
                  </div>
                </div>
                <Button onClick={() => soon("Spiritual Forest Trek")} className="w-full md:w-fit">
                  Reserve My Spot
                  <Trees className="ml-2 h-[18px] w-[18px]" />
                </Button>
              </div>
              <div className="relative h-72 overflow-hidden md:col-span-2 md:h-96">
                <img
                  src={endureImg}
                  alt="Spiritual Forest Trek"
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-dz-glass-border bg-white/80 px-2.5 py-1.5 backdrop-blur">
                    <Mountain className="h-4 w-4 text-dz-secondary" />
                    <span className="text-xs font-semibold text-foreground">Daily Treks</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-dz-glass-border bg-white/80 px-2.5 py-1.5 backdrop-blur">
                    <Sparkles className="h-4 w-4 text-dz-secondary" />
                    <span className="text-xs font-semibold text-foreground">Forest Meds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== QUIZ CTA ===== */}
        <GlassCard className="p-10 text-center">
          <h3 className="mb-2 font-display text-2xl font-semibold text-primary">
            Can't decide on a destination?
          </h3>
          <p className="mx-auto mb-6 max-w-xl text-dz-muted">
            Take our wellness quiz to find the trip that aligns with your current energy and goals.
          </p>
          <Button
            onClick={() => toast({ title: "Wellness quiz", description: "Our trip matchmaker is coming soon." })}
            className="rounded-full px-8"
          >
            Start Wellness Quiz
          </Button>
        </GlassCard>
      </PageContainer>
    </DashboardShell>
  );
}
