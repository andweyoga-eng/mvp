import { useState, useEffect } from "react";
// Carousel slides temporarily replaced by Treat a Retreat hero creative.
// import embraceImage from "@assets/embrace-carousel.png";
// import experienceImage from "@assets/experience_1756460037530.jpg";
// import expressImage from "@assets/express_1756460037530.jpg";
// import evolveImage from "@assets/evolve-carousel.png";
// import elevateImage from "@assets/elevate-carousel.png";
// import becomeImage from "@assets/become-carousel.png";
import treatRetreatImage from "@assets/treat-retreat-hero.png";
import { cn } from "@/lib/utils";

/**
 * Single hero creative with a timed word-trail.
 * Each phrase is lead text (display font) + an accented word in the italic accent font.
 */
const phrases = [
  { lead: "We", accent: "Run" },
  { lead: "We", accent: "Lift" },
  { lead: "We", accent: "chat" },
  { lead: "We", accent: "fuel" },
  { lead: "and We", accent: "Yoga" },
];

const PHRASE_DURATION_MS = 2200;
const TRAIL_HOLD_MS = 1000;

export default function HeroCarousel() {
  const [phraseStep, setPhraseStep] = useState(0);

  // Loop the word-trail with a short hold on the last phrase.
  useEffect(() => {
    const isLast = phraseStep === phrases.length - 1;
    const delay = isLast ? PHRASE_DURATION_MS + TRAIL_HOLD_MS : PHRASE_DURATION_MS;
    const timeout = setTimeout(() => {
      setPhraseStep((prev) => (prev + 1) % phrases.length);
    }, delay);
    return () => clearTimeout(timeout);
  }, [phraseStep]);

  return (
    <section id="home" className="relative h-[100dvh] min-h-[100svh] w-full overflow-hidden bg-[#f5f0e8]">
      <div className="absolute inset-0">
        <img
          src={treatRetreatImage}
          alt=""
          role="presentation"
          className="h-full w-full object-cover object-center"
          data-testid="carousel-image-0"
        />
        <div className="absolute inset-0 gradient-overlay" />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-6 text-center">
        <h1
          className="relative mb-5 flex min-h-[clamp(6rem,16vw,11rem)] w-full items-center justify-center font-display text-[clamp(2.75rem,7.5vw,5.25rem)] font-bold leading-[1.04] tracking-tight text-white drop-shadow-lg"
          aria-label={phrases.map((p) => `${p.lead} ${p.accent}`).join(". ")}
        >
          {phrases.map((phrase, index) => (
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
          // TBD: wire to Treat a Retreat program booking once the program is created
          onClick={() => {}}
          className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[clamp(1rem,1.6vw,1.1875rem)] font-bold text-white shadow-dz-hero transition hover:-translate-y-0.5"
          style={{ background: "var(--gradient-cta)" }}
          data-testid="hero-cta-schedule"
        >
          Treat a Retreat here
        </button>
      </div>
    </section>
  );
}
