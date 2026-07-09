import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Paperclip,
  Smile,
  Mic,
  Leaf,
  Sparkles,
  Lightbulb,
  Heart,
  ArrowRight,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { ImageHeroContent, ImageHeroScrim } from "@/components/digital-zen/image-hero-scrim";
import { PageContainer } from "@/components/digital-zen/page-container";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import embraceBwImg from "@assets/embrace-bw_1756454628744.jpg";
import insta1 from "@assets/insta-profile-1_1756815967899.jpg";
import insta2 from "@assets/insta-profile-2_1756815967899.jpg";

const RECENT = [
  {
    icon: Leaf,
    tone: "bg-emerald-600/15 text-emerald-700",
    when: "Yesterday, 6:45 PM",
    title: "Evening Stillness",
    body: "Found peace in the gentle hum of the city tonight. The sound bath session really helped clear the mental fog.",
  },
  {
    icon: Sparkles,
    tone: "bg-dz-secondary/15 text-dz-secondary",
    when: "3 days ago",
    title: "Creative Spark",
    body: "Visualizing the flow during Vinyasa today brought so many new ideas for my painting project.",
  },
];

const VIBES = [
  { label: "Calm", value: 85, bar: "bg-primary" },
  { label: "Energy", value: 40, bar: "bg-dz-secondary" },
  { label: "Focus", value: 65, bar: "bg-emerald-600" },
];

const GALLERY = [meditationImg, soundtherapyImg, embraceBwImg, insta1, insta2, meditationImg];

export default function Emojou() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    if (!authLoading && !user) setLocation("/");
  }, [authLoading, user, setLocation]);

  const saveMoment = () => {
    if (!reflection.trim()) {
      toast({ title: "Nothing to save yet", description: "Write a few words about your day first." });
      return;
    }
    toast({ title: "Moment saved", description: "Your reflection has been added to your journal." });
    setReflection("");
  };

  return (
    <DashboardShell active="emojou">
      <PageContainer className="relative py-[clamp(20px,4vw,40px)] pb-24">
        {/* Ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute -left-40 top-0 -z-10 h-[460px] w-[460px] rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-32 bottom-24 -z-10 h-96 w-96 rounded-full bg-dz-secondary/10 blur-3xl" />

        {/* ===== HERO ===== */}
        <section className="mb-8">
          <div className="group relative h-[420px] overflow-hidden rounded-3xl shadow-dz-hero sm:h-[480px]">
            <img
              src={soundtherapyImg}
              alt="Sound healing session"
              className="h-full w-full scale-105 object-cover transition-transform duration-1000 group-hover:scale-100"
            />
            <ImageHeroScrim variant="dark-bottom" />
            <ImageHeroContent className="absolute inset-0 flex flex-col justify-end p-7 sm:p-12">
              <div className="max-w-3xl">
                <span className="mb-3 inline-block rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  Vibe check: zen mode engaged
                </span>
                <h1 className="mb-5 font-display text-[clamp(32px,6vw,64px)] font-bold leading-tight text-white">
                  Your soul's <span className="font-accent italic font-normal">creative</span> playground
                </h1>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => document.getElementById("reflection")?.focus()}
                    className="bg-white text-primary hover:bg-white/90"
                  >
                    Start Expressing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast({ title: "Today's vibe", description: "Daily vibe prompts are coming soon." })}
                    className="border-white/40 bg-white/15 text-white backdrop-blur hover:bg-white/25"
                  >
                    Today's Vibe
                  </Button>
                </div>
              </div>
            </ImageHeroContent>
          </div>
        </section>

        {/* ===== CONTENT GRID ===== */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Reflections */}
          <div className="flex flex-col gap-6 md:col-span-8">
            <GlassCard className="relative overflow-hidden p-7">
              <Leaf className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary/5" />
              <h2 className="mb-4 font-display text-xl font-semibold text-primary">Mindful Reflections</h2>
              <Textarea
                id="reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="How does your soul feel today?"
                className="mb-4 h-44 resize-none border-dz-glass-border bg-white/60"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {[Paperclip, Smile, Mic].map((Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toast({ title: "Coming soon", description: "Rich attachments arrive soon." })}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-dz-glass-border bg-white/70 text-primary transition hover:bg-primary hover:text-white"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </button>
                  ))}
                </div>
                <Button onClick={saveMoment}>Save Moment</Button>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {RECENT.map((r) => (
                <GlassCard key={r.title} className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", r.tone)}>
                      <r.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-dz-muted">{r.when}</span>
                  </div>
                  <h4 className="mb-1.5 font-display text-lg font-semibold text-primary">{r.title}</h4>
                  <p className="line-clamp-3 text-sm text-dz-muted">{r.body}</p>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Vibe tracker + intention */}
          <div className="flex flex-col gap-6 md:col-span-4">
            <GlassCard className="p-7">
              <h3 className="mb-5 font-display text-lg font-semibold text-primary">Vibe Tracker</h3>
              <div className="space-y-4">
                {VIBES.map((v) => (
                  <div key={v.label} className="flex items-center justify-between gap-3">
                    <span className="w-16 text-sm font-medium text-foreground">{v.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", v.bar)} style={{ width: `${v.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 border-t border-dz-glass-border pt-4 text-sm italic text-dz-muted">
                "The soul always knows what to do to heal itself. The challenge is to silence the
                mind."
              </p>
            </GlassCard>

            <div className="rounded-[22px] bg-gradient-to-br from-primary to-dz-secondary p-7 text-white shadow-dz-hero">
              <h3 className="mb-4 font-display text-lg font-semibold">Daily Intention</h3>
              <div className="flex items-center gap-3">
                <Lightbulb className="h-9 w-9 shrink-0" />
                <p className="font-semibold">Today I will cultivate gratitude for small wins.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => toast({ title: "Set intention", description: "Custom intentions are coming soon." })}
                className="mt-6 w-full border-white/40 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                Set New Goal
              </Button>
            </div>
          </div>

          {/* Gallery */}
          <div className="md:col-span-12">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-primary">Mindful Moments</h2>
                <p className="text-sm text-dz-muted">A visual diary of your journey through light and breath.</p>
              </div>
              <button
                type="button"
                onClick={() => toast({ title: "Gallery", description: "Your full gallery is coming soon." })}
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View Full Gallery <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {GALLERY.map((src, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-dz-glass-border">
                  <img
                    src={src}
                    alt={`Moment ${i + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/25 opacity-0 transition-opacity group-hover:opacity-100">
                    <Heart className="h-7 w-7 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </PageContainer>
    </DashboardShell>
  );
}
