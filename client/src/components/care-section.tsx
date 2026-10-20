import { HeartHandshake, Accessibility } from "lucide-react";
import { SectionHeading } from "@/components/digital-zen/section-heading";
import { PageContainer } from "@/components/digital-zen/page-container";

const carePrograms = [
  {
    title: "Blind School Partnership",
    description:
      "We conduct weekly adaptive yoga sessions at the Mumbai Association for the Blind, creating accessible wellness programs focused on spatial awareness, balance, and mindful movement.",
    schedule: "Every Tuesday · 3:00 PM · Free of Charge",
    icon: HeartHandshake,
    iconBg: "bg-primary/10 text-primary",
  },
  {
    title: "Paraplegic Institute Sessions",
    description:
      "At the Indian Spinal Injuries Centre, we offer specialized chair yoga and upper body strength programs to improve flexibility, respiratory function, and mental wellness.",
    schedule: "Every Friday · 4:00 PM · Community Service",
    icon: Accessibility,
    iconBg: "bg-dz-secondary/10 text-dz-secondary",
  },
];

export default function CareSection() {
  return (
    <section id="care" className="bg-gradient-to-b from-dz-surface to-[#f4f1f8] py-16 md:py-20">
      <PageContainer>
        <SectionHeading
          title="and We"
          accent="Care"
          subtitle="Our commitment extends beyond the studio through meaningful community partnerships and inclusive wellness initiatives."
        />
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-7">
          {carePrograms.map((program) => (
            <div
              key={program.title}
              className="rounded-[22px] border border-dz-glass-border bg-white p-8 text-center shadow-dz-ambient"
            >
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${program.iconBg}`}
              >
                <program.icon className="h-8 w-8" />
              </div>
              <h3 className="mb-3 font-display text-xl font-semibold text-primary">{program.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-dz-muted">{program.description}</p>
              <p className="text-sm font-bold text-dz-secondary">{program.schedule}</p>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
