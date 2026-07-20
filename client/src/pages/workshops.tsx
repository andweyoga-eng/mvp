import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Calendar,
  MapPin,
  Users,
  Video,
  Award,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { ImageHeroContent, ImageHeroScrim } from "@/components/digital-zen/image-hero-scrim";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";
import elevateImg from "@assets/elevate_1756454651946.jpg";

const CATEGORIES = [
  "All Workshops",
  "Asana",
  "Meditation",
  "Pranayama",
  "Philosophy",
  "Teacher Training",
] as const;

type Category = (typeof CATEGORIES)[number];

type Tone = "primary" | "sage" | "secondary";

interface WorkshopCard {
  id: string;
  title: string;
  price: string;
  blurb: string;
  image: string;
  tag: string;
  tagTone: Tone;
  category: Exclude<Category, "All Workshops">;
  rows: { icon: typeof Calendar; text: string }[];
  cta: string;
}

const WORKSHOPS: WorkshopCard[] = [
  {
    id: "advanced-asana",
    title: "Advanced Asana Intensive",
    price: "₹4,999",
    blurb:
      "Master the mechanics of complex transitions and inversions with personalized adjustments from senior teachers.",
    image: hathaYogaImg,
    tag: "INTERMEDIATE+",
    tagTone: "primary",
    category: "Asana",
    rows: [
      { icon: Calendar, text: "Sat, Oct 24 • 10:00 AM to 4:00 PM" },
      { icon: MapPin, text: "Lotus Sky Studio (Hybrid)" },
      { icon: Users, text: "Limited to 15 practitioners" },
    ],
    cta: "Register Now",
  },
  {
    id: "mindfulness-beginners",
    title: "Mindfulness for Beginners",
    price: "₹2,499",
    blurb:
      "An approachable introduction to formal meditation, mindful movement, and everyday presence techniques.",
    image: meditationImg,
    tag: "BEGINNER FRIENDLY",
    tagTone: "sage",
    category: "Meditation",
    rows: [
      { icon: Calendar, text: "Sun, Oct 25 • 2:00 PM to 6:00 PM" },
      { icon: Video, text: "Live stream + on-demand access" },
      { icon: Award, text: "Certificate of completion included" },
    ],
    cta: "Book Spot",
  },
  {
    id: "breathwork-pranayama",
    title: "Breathwork & Pranayama Masterclass",
    price: "₹3,299",
    blurb:
      "Explore the science and spirit of the breath. Learn advanced pranayama techniques to regulate the nervous system.",
    image: soundtherapyImg,
    tag: "POPULAR",
    tagTone: "secondary",
    category: "Pranayama",
    rows: [
      { icon: Calendar, text: "Wed, Oct 28 • 6:30 PM to 9:00 PM" },
      { icon: UserIcon, text: "Led by Dr. Elena Vasquez" },
      { icon: Sparkles, text: "Bonus: digital pranayama guide" },
    ],
    cta: "Join Workshop",
  },
];

const TAG_TONES: Record<Tone, string> = {
  primary: "bg-primary/90 text-white",
  sage: "bg-emerald-600/90 text-white",
  secondary: "bg-dz-secondary/90 text-white",
};

export default function Workshops() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [category, setCategory] = useState<Category>("All Workshops");
  const [sort, setSort] = useState("Upcoming Date");

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const visible = useMemo(
    () =>
      category === "All Workshops"
        ? WORKSHOPS
        : WORKSHOPS.filter((w) => w.category === category),
    [category],
  );

  const soon = (title: string) =>
    toast({ title, description: "Workshop registrations open soon. We'll notify you." });

  return (
    <DashboardShell active="workshops">
      <PageContainer className="py-[clamp(20px,4vw,40px)] pb-24">
        {/* ===== HERO ===== */}
        <section className="relative mb-8 flex min-h-[300px] items-end overflow-hidden rounded-3xl sm:min-h-[360px] lg:items-center">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${elevateImg})` }}
            aria-hidden
          />
          <ImageHeroScrim variant="brand-horizontal" />
          <ImageHeroContent className="relative z-10 max-w-xl p-8 text-white sm:p-12">
            <span className="mb-3 inline-block rounded-full bg-dz-secondary/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              Season Finale
            </span>
            <h1 className="mb-3 font-display text-[clamp(28px,4vw,48px)] font-bold leading-tight">
              Elevate your <span className="font-accent italic font-normal">practice</span>.
            </h1>
            <p className="mb-6 max-w-md text-[15px] leading-relaxed text-white/90">
              Deepen your knowledge with curated masterclasses led by world-class instructors:
              transformative experiences designed for every level.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => document.getElementById("workshop-grid")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-white text-primary hover:bg-white/90"
              >
                Explore Categories
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/my-account#sessions")}
                className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                My Registrations
              </Button>
            </div>
          </ImageHeroContent>
        </section>

        {/* ===== FILTERS & SORT ===== */}
        <div className="mb-7 flex flex-col items-start justify-between gap-4 border-b border-dz-glass-border pb-4 md:flex-row md:items-center">
          <div className="scrollbar-hide -mx-1 flex w-full gap-5 overflow-x-auto whitespace-nowrap px-1 md:w-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "pb-2 text-sm font-semibold transition-colors",
                  category === c
                    ? "border-b-2 border-primary text-primary"
                    : "text-dz-muted hover:text-primary",
                )}
                data-testid={`workshop-cat-${c.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-dz-muted">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer rounded-lg border border-dz-glass-border bg-white/70 px-2 py-1.5 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option>Upcoming Date</option>
              <option>Price: Low to High</option>
              <option>Popularity</option>
            </select>
          </div>
        </div>

        {/* ===== GRID ===== */}
        <div id="workshop-grid" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((w) => (
            <article
              key={w.id}
              className="group overflow-hidden rounded-2xl border border-dz-glass-border bg-white/70 shadow-dz-ambient backdrop-blur-[20px] transition hover:-translate-y-1 hover:shadow-dz-hero"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={w.image}
                  alt={w.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span
                  className={cn(
                    "absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur",
                    TAG_TONES[w.tagTone],
                  )}
                >
                  {w.tag}
                </span>
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold leading-tight text-primary">
                    {w.title}
                  </h3>
                  <span className="shrink-0 font-display text-lg font-bold text-dz-secondary">
                    {w.price}
                  </span>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-dz-muted">{w.blurb}</p>
                <div className="mb-5 space-y-2 border-t border-dz-glass-border pt-4">
                  {w.rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-dz-muted">
                      <r.icon className="h-[18px] w-[18px] text-primary" />
                      <span className="text-[13px]">{r.text}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={() => soon(w.title)} className="w-full">
                  {w.cta}
                </Button>
              </div>
            </article>
          ))}
        </div>

        {visible.length === 0 && (
          <GlassCard className="mt-6 p-10 text-center text-dz-muted">
            No workshops in this category yet. Check back soon.
          </GlassCard>
        )}

        {/* ===== NEWSLETTER CTA ===== */}
        <GlassCard className="relative mt-10 flex flex-col items-center justify-between gap-6 overflow-hidden p-8 md:flex-row">
          <div className="max-w-xl">
            <h2 className="mb-1.5 font-display text-2xl font-semibold text-primary">
              Don't miss future workshops
            </h2>
            <p className="text-sm text-dz-muted">
              Subscribe to receive early access to registrations and exclusive wellness tips from
              our expert community.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast({ title: "Subscribed", description: "You're on the list for workshop updates." });
            }}
            className="flex w-full flex-col gap-2 sm:flex-row md:w-auto"
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="w-full rounded-lg border border-dz-glass-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-72"
            />
            <Button type="submit" className="whitespace-nowrap">
              Subscribe
            </Button>
          </form>
        </GlassCard>
      </PageContainer>
    </DashboardShell>
  );
}
