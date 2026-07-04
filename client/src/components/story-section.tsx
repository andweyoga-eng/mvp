import { SectionHeading } from "@/components/digital-zen/section-heading";
import { PageContainer } from "@/components/digital-zen/page-container";

export default function StorySection() {
  return (
    <section id="story" className="bg-dz-surface py-16 md:py-20">
      <PageContainer className="max-w-2xl text-center">
        <SectionHeading title="and Our" accent="Story" className="mb-8" />
        <div className="space-y-5 text-base leading-relaxed text-dz-muted">
          <p>
            Our story begins with the transformative power of yoga and the belief that personal
            healing can create ripples of positive change in the world.
          </p>
          <p>
            In April 2023, andWeYoga was born in Bengaluru with a simple yet powerful philosophy:{" "}
            <span className="font-accent italic text-[#4b3282]">
              &ldquo;We meet, we greet, we do whatever we like. We play, we paint, we run, we
              picnic, and we yoga too.&rdquo;
            </span>
          </p>
          <p>
            Today, andWeYoga continues to grow stronger every day. We&apos;ve built more than a yoga
            studio. We&apos;ve created a family where transformation is celebrated and every
            individual&apos;s journey is honored.
          </p>
        </div>
      </PageContainer>
    </section>
  );
}
