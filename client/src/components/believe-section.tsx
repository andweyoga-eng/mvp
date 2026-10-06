import { SectionHeading } from "@/components/digital-zen/section-heading";
import { PageContainer } from "@/components/digital-zen/page-container";

export default function BelieveSection() {
  return (
    <section id="believe" className="bg-[#f4f1f8] py-16 md:py-24">
      <PageContainer className="max-w-3xl text-center">
        <SectionHeading title="and We" accent="Believe" />
        <p className="font-accent text-[clamp(1.0625rem,2vw,1.5rem)] italic leading-relaxed text-[#4b3282]">
          &ldquo;We believe you don&apos;t have to win to win in life. It&apos;s about progress and
          not perfection. Connection and not competition. Learning and not losing. Go with the
          flow. Inside out, outside in. And that is yoga.&rdquo;
        </p>
      </PageContainer>
    </section>
  );
}
