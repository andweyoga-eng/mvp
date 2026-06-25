import { useState, useEffect } from "react";
import embraceImage from "@assets/embrace-carousel.png";
import experienceImage from "@assets/experience_1756460037530.jpg";
import expressImage from "@assets/express_1756460037530.jpg";
import evolveImage from "@assets/evolve-carousel.png";
import elevateImage from "@assets/elevate_1756460037530.jpg";
import becomeImage from "@assets/become_1756460037530.jpg";
import { navigateToHomeSection } from "@/lib/home-navigation";
import { cn } from "@/lib/utils";

/**
 * Each slide plays a 3-phrase word-trail. The first phrase is always
 * "and We Yoga", the second is the slide's word, and the third is its
 * closing line. Each phrase is split into lead text (display font) + an
 * accented word/phrase rendered in the italic accent font.
 */
const BRAND_PHRASE = { lead: "and We", accent: "Yoga" };

const slides = [
  {
    image: embraceImage,
    word: "Embrace",
    trail: [BRAND_PHRASE, { lead: "To", accent: "Embrace" }, { lead: "Journey of Self", accent: "Discovery" }],
  },
  {
    image: experienceImage,
    word: "Experience",
    trail: [BRAND_PHRASE, { lead: "To", accent: "Experience" }, { lead: "Our Body", accent: "inside out, Outside in." }],
  },
  {
    image: expressImage,
    word: "Express",
    trail: [BRAND_PHRASE, { lead: "To", accent: "Express" }, { lead: "To feel safe and", accent: "Smile" }],
  },
  {
    image: evolveImage,
    word: "Evolve",
    trail: [BRAND_PHRASE, { lead: "To", accent: "Evolve" }, { lead: "To Learn and", accent: "Grow" }],
  },
  {
    image: elevateImage,
    word: "Elevate",
    trail: [BRAND_PHRASE, { lead: "To", accent: "Elevate" }, { lead: "To push beyond", accent: "our limits" }],
  },
  {
    image: becomeImage,
    word: "Become",
    trail: [BRAND_PHRASE, { lead: "To", accent: "Become" }, { lead: "Who we are", accent: "meant to be" }],
  },
];

const PHRASE_DURATION_MS = 2200;
const TRAIL_HOLD_MS = 1000;
const PHRASES_PER_SLIDE = 3;

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phraseStep, setPhraseStep] = useState(0);

  // Auto-advance — each slide stays long enough to play its full word-trail.
  useEffect(() => {
    const duration = PHRASE_DURATION_MS * PHRASES_PER_SLIDE + TRAIL_HOLD_MS;
    const timeout = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, duration);
    return () => clearTimeout(timeout);
  }, [currentSlide]);

  // Step through the active slide's word-trail.
  useEffect(() => {
    setPhraseStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < PHRASES_PER_SLIDE; i++) {
      timers.push(setTimeout(() => setPhraseStep(i), PHRASE_DURATION_MS * i));
    }
    return () => timers.forEach(clearTimeout);
  }, [currentSlide]);

  const slide = slides[currentSlide];

  return (
    <section id="home" className="relative h-[clamp(520px,82vh,760px)] overflow-hidden">
      {slides.map((s, index) => (
        <div
          key={s.word}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={s.image}
            alt=""
            role="presentation"
            className="h-full w-full object-cover"
            data-testid={`carousel-image-${index}`}
          />
          <div className="absolute inset-0 gradient-overlay" />
        </div>
      ))}

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-[72px] text-center">
        <h1
          className="relative mb-5 flex min-h-[clamp(6rem,16vw,11rem)] w-full items-center justify-center font-display text-[clamp(2.75rem,7.5vw,5.25rem)] font-bold leading-[1.04] tracking-tight text-white drop-shadow-lg"
          aria-label={slide.trail.map((p) => `${p.lead} ${p.accent}`).join(". ")}
        >
          {slide.trail.map((phrase, index) => (
            <span
              key={phrase.accent}
              aria-hidden={index !== phraseStep}
              className={cn(
                "absolute inset-0 flex items-center justify-center px-2 text-center transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                index === phraseStep
                  ? "translate-y-0 scale-100 opacity-100 blur-0"
                  : "pointer-events-none translate-y-4 scale-[0.97] opacity-0 blur-[6px]",
              )}
            >
              <span>
                {phrase.lead}{" "}
                <span className="font-accent font-normal italic">{phrase.accent}</span>
              </span>
            </span>
          ))}
        </h1>
        <button
          type="button"
          onClick={() => navigateToHomeSection("teach")}
          className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[clamp(1rem,1.6vw,1.1875rem)] font-bold text-white shadow-dz-hero transition hover:-translate-y-0.5"
          style={{ background: "var(--gradient-cta)" }}
          data-testid="hero-cta-schedule"
        >
          Find Your Flow
        </button>

        <div className="mt-8 flex gap-2.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index === currentSlide ? "bg-white" : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
