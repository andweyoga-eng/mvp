import { SectionHeading } from "@/components/digital-zen/section-heading";
import { PageContainer } from "@/components/digital-zen/page-container";

export default function ConnectSection() {
  return (
    <section id="connect" className="bg-dz-surface py-16 md:py-20">
      <PageContainer>
        <div className="flex flex-wrap items-center gap-12">
          <div className="min-w-[min(100%,420px)] flex-1">
            <SectionHeading
              title="and We"
              accent="Connect"
              align="left"
              subtitle="True wellness happens in connection — with yourself, with others, and with the world around you."
            />
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-dz-glass-border bg-white p-4 text-center">
                <h4 className="font-display font-semibold text-primary">Weekly Circles</h4>
                <p className="mt-1 text-xs text-dz-muted">Community discussions &amp; shared journeys</p>
              </div>
              <div className="rounded-2xl border border-dz-glass-border bg-white p-4 text-center">
                <h4 className="font-display font-semibold text-primary">Yoga Retreats</h4>
                <p className="mt-1 text-xs text-dz-muted">Deep connections through immersive experiences</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3.5">
              <button
                type="button"
                className="rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-dz-primary transition hover:-translate-y-0.5"
              >
                Join Events
              </button>
              <button
                type="button"
                className="rounded-full border-[1.5px] border-primary/30 px-7 py-3.5 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Community Hub
              </button>
            </div>
          </div>
          <div className="relative min-w-[min(100%,380px)] flex-1">
            <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#d7cfe6] to-[#c8bdd9]">
              <span className="text-8xl text-primary/20" aria-hidden>
                🧘
              </span>
            </div>
            <div className="absolute -bottom-3 -right-3 rounded-2xl bg-dz-secondary px-6 py-4 text-white shadow-lg">
              <div className="font-display text-3xl font-bold leading-none">365</div>
              <div className="mt-1 text-xs opacity-90">Days Connected</div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
