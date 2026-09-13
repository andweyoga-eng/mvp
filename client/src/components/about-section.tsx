import { navigateToHomeSection } from "@/lib/home-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { PageContainer } from "@/components/digital-zen/page-container";

export default function AboutSection() {
  return (
    <section id="about" className="bg-[#f4f1f8] py-16 md:py-20">
      <PageContainer className="max-w-3xl text-center">
        <h2 className="mb-6 flex flex-wrap items-center justify-center gap-3 font-display text-[clamp(1.875rem,5vw,3.25rem)] font-bold tracking-tight text-primary">
          About <BrandLogo imgClassName="h-[clamp(2.75rem,5.5vw,3.75rem)] w-auto" />
        </h2>
        <p className="mb-4 text-[clamp(0.9375rem,1.6vw,1.125rem)] leading-relaxed text-dz-muted">
          Founded in 2018, andWeYoga has been a sanctuary for wellness seekers and yoga practitioners
          of all levels. Our mission is to create a welcoming space where everyone can discover the
          transformative power of yoga.
        </p>
        <p className="mb-7 text-[clamp(0.9375rem,1.6vw,1.125rem)] leading-relaxed text-dz-muted">
          With certified instructors and a variety of class styles, we&apos;re committed to helping you
          find balance, strength, and inner peace through the ancient practice of yoga.
        </p>
        <div className="flex flex-col justify-center gap-3.5 sm:flex-row">
          <button
            type="button"
            onClick={() => navigateToHomeSection("ally")}
            className="rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-dz-primary"
            data-testid="meet-instructors-button"
          >
            and We Meet Coach
          </button>
          <button
            type="button"
            onClick={() => navigateToHomeSection("story")}
            className="rounded-full border-[1.5px] border-primary/30 px-7 py-3.5 text-sm font-bold text-primary hover:bg-primary/5"
            data-testid="our-story-button"
          >
            and Our Story
          </button>
        </div>
      </PageContainer>
    </section>
  );
}
