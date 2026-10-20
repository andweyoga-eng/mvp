import { useState, useEffect, useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { activateHeroCta, heroCtaTargetsFlowCard, heroCtaTargetsSchedule } from "@/lib/home-navigation";
import { heroSlideImageSrc } from "@/lib/hero-slide-images";
import { cn } from "@/lib/utils";
import {
  defaultHeroCtaConfig,
  publishedHeroSlides,
  resolveHeroSlideCta,
  resolveHeroSlideDisclaimer,
  type HeroCtaConfig,
  type HeroSlideCta,
} from "@shared/hero-cta";

const SWIPE_THRESHOLD_PX = 48;
const DEFAULT_CTA_CONFIG = defaultHeroCtaConfig();

interface HeroCarouselProps {
  /** Opens sign-in when the active slide's button is set to Schedule. */
  onScheduleSignIn?: () => void;
  /** Opens the mapped and We Flow card (button and photo). */
  onFlowCard?: (classTypeId: string) => void;
}

export default function HeroCarousel({ onScheduleSignIn, onFlowCard }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phraseStep, setPhraseStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

  const { data: ctaConfig, isPlaceholderData } = useQuery<HeroCtaConfig>({
    queryKey: ["/api/hero-cta"],
    queryFn: async () => {
      const res = await fetch("/api/hero-cta");
      if (!res.ok) throw new Error("Failed to load hero CTA");
      return res.json();
    },
    staleTime: 60_000,
    placeholderData: DEFAULT_CTA_CONFIG,
  });

  const config = ctaConfig ?? DEFAULT_CTA_CONFIG;
  const slides = useMemo(() => publishedHeroSlides(config), [config]);
  const activeIndex =
    slides.length === 0 ? 0 : Math.min(currentSlide, slides.length - 1);
  const slide: HeroSlideCta = slides[activeIndex] ?? slides[0]!;
  const activeCta = resolveHeroSlideCta(config, slide);
  const disclaimer = resolveHeroSlideDisclaimer(config, slide);
  const phraseKey = slide.phrases.map((phrase) => phrase.durationMs).join(",");

  useEffect(() => {
    setCurrentSlide((prev) => (slides.length === 0 ? 0 : Math.min(prev, slides.length - 1)));
  }, [slides.length]);

  // Auto-advance after the three lines and the pause on the last line.
  // A single published slide repeats its lines instead of moving.
  useEffect(() => {
    const phraseMs = slide.phrases.reduce((sum, phrase) => sum + phrase.durationMs, 0);
    const timeout = setTimeout(() => {
      if (slides.length <= 1) {
        setCycle((prev) => prev + 1);
        return;
      }
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, phraseMs + slide.holdMs);
    return () => clearTimeout(timeout);
  }, [currentSlide, cycle, slides.length, slide.holdMs, phraseKey, slide.phrases]);

  useEffect(() => {
    setPhraseStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 1; i < slide.phrases.length; i++) {
      elapsed += slide.phrases[i - 1]!.durationMs;
      const step = i;
      timers.push(setTimeout(() => setPhraseStep(step), elapsed));
    }
    return () => timers.forEach(clearTimeout);
  }, [currentSlide, cycle, phraseKey, slide.phrases]);

  function goToSlide(index: number) {
    setCurrentSlide(((index % slides.length) + slides.length) % slides.length);
  }

  function goNext() {
    goToSlide(currentSlide + 1);
  }

  function goPrev() {
    goToSlide(currentSlide - 1);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    didSwipe.current = false;
  }

  function onPointerUp(e: PointerEvent) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      didSwipe.current = true;
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  function runActiveCta() {
    if (heroCtaTargetsFlowCard(activeCta)) {
      onFlowCard?.(activeCta.classTypeId);
      return;
    }
    if (heroCtaTargetsSchedule(activeCta)) {
      onScheduleSignIn?.();
      return;
    }
    activateHeroCta(activeCta);
  }

  function onHeroActivate(e: MouseEvent) {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-hero-no-navigate]")) return;
    runActiveCta();
  }

  return (
    <section
      id="home"
      className="relative h-[clamp(520px,82vh,760px)] cursor-pointer overflow-hidden touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onClick={onHeroActivate}
      data-testid="hero-carousel"
    >
      {!isPlaceholderData
        ? slides.map((s, index) => (
            <div
              key={s.word}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <img
                src={heroSlideImageSrc(s)}
                alt=""
                role="presentation"
                className="h-full w-full object-cover"
                data-testid={`carousel-image-${index}`}
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 gradient-overlay" />
            </div>
          ))
        : null}

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-[72px] text-center">
        <h1
          className="relative mb-5 flex min-h-[clamp(6rem,16vw,11rem)] w-full items-center justify-center font-display text-[clamp(2.75rem,7.5vw,5.25rem)] font-bold leading-[1.04] tracking-tight text-white drop-shadow-lg"
          aria-label={slide.phrases.map((phrase) => `${phrase.lead} ${phrase.accent}`.trim()).join(". ")}
        >
          {slide.phrases.map((phrase, index) => (
            <span
              key={`${slide.word}-${index}`}
              aria-hidden={index !== phraseStep}
              className={cn(
                "absolute inset-0 flex items-center justify-center px-2 text-center transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                index === phraseStep
                  ? "translate-y-0 scale-100 opacity-100 blur-0"
                  : "pointer-events-none translate-y-4 scale-[0.97] opacity-0 blur-[6px]",
              )}
            >
              <span>
                {phrase.lead}
                {phrase.lead && phrase.accent ? " " : ""}
                {phrase.accent ? (
                  <span className="font-accent font-normal italic">{phrase.accent}</span>
                ) : null}
              </span>
            </span>
          ))}
        </h1>
        <button
          type="button"
          data-hero-no-navigate
          onClick={(e) => {
            e.stopPropagation();
            runActiveCta();
          }}
          className="pointer-events-auto relative z-10 inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[clamp(1rem,1.6vw,1.1875rem)] font-bold text-white shadow-dz-hero transition hover:-translate-y-0.5"
          style={{ background: "var(--gradient-cta)" }}
          data-testid="hero-cta-schedule"
        >
          {activeCta.label}
        </button>

        <div className="mt-8 flex gap-2.5" data-hero-no-navigate onClick={(e) => e.stopPropagation()}>
          {slides.map((s, index) => (
            <button
              key={s.word}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index === activeIndex ? "bg-white" : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>
      </div>

      {disclaimer ? (
        <p
          data-hero-no-navigate
          data-testid="hero-slide-disclaimer"
          title={disclaimer}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 right-4 z-20 max-w-[min(70%,28rem)] truncate text-right text-[11px] font-medium leading-none text-white/90 drop-shadow"
        >
          {disclaimer}
        </p>
      ) : null}
    </section>
  );
}
