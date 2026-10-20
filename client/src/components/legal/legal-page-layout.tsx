import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { PageContainer } from "@/components/digital-zen/page-container";
import { cn } from "@/lib/utils";
import { LEGAL_CONFIG } from "@shared/legal-config";

export type LegalSection = { id: string; title: string | ((lang: "en" | "kn") => string) };

interface LegalPageLayoutProps {
  title: string | ((lang: "en" | "kn") => string);
  subtitle?: string | ((lang: "en" | "kn") => string);
  sections: LegalSection[];
  children: ReactNode | ((lang: "en" | "kn") => ReactNode);
  showLanguageToggle?: boolean;
}

export function LegalPageLayout({
  title,
  subtitle,
  sections,
  children,
  showLanguageToggle = false,
}: LegalPageLayoutProps) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [lang, setLang] = useState<"en" | "kn">("en");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-dz-background">
      <Navigation onBookingClick={() => { window.location.href = "/?openBooking=true"; }} />
      <PageContainer className="py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-dz-muted">
              {lang === "kn" ? "ಕಾನೂನು" : "Legal"}
            </p>
            <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">
              {typeof title === "function" ? title(lang) : title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-dz-muted">
                {typeof subtitle === "function" ? subtitle(lang) : subtitle}
              </p>
            ) : null}
          </div>
          {showLanguageToggle ? (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-dz-muted">
                {lang === "kn" ? "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Choose your language"}
              </span>
              <div className="flex rounded-lg border border-dz-glass-border bg-white/80 p-0.5 text-xs font-semibold">
                {(["en", "kn"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={cn(
                      "rounded-md px-2.5 py-1",
                      lang === code ? "bg-primary text-white" : "text-dz-muted",
                    )}
                  >
                    {code === "en" ? "English" : "ಕನ್ನಡ"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <nav
            className="hidden shrink-0 lg:sticky lg:top-24 lg:block lg:w-52"
            aria-label="Page sections"
          >
            <ul className="space-y-1 border-l border-dz-glass-border pl-3">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      "block py-1.5 text-sm transition-colors",
                      active === s.id
                        ? "font-semibold text-primary"
                        : "text-dz-muted hover:text-primary",
                    )}
                  >
                    {typeof s.title === "function" ? s.title(lang) : s.title}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 text-xs text-dz-muted">
              <Link href="/privacy" className="block hover:text-primary">
                {lang === "kn" ? "ಗೌಪ್ಯತಾ ಸೂಚನೆ" : "Privacy Notice"}
              </Link>
              <Link href="/terms" className="block hover:text-primary">
                {lang === "kn" ? "ಸೇವಾ ನಿಯಮಗಳು" : "Terms of Service"}
              </Link>
              <Link href="/grievance" className="block hover:text-primary">
                {lang === "kn" ? "ದೂರು ಪರಿಹಾರ" : "Grievance Redressal"}
              </Link>
            </div>
          </nav>

          <article className="max-w-[740px] flex-1 space-y-10 text-[15px] leading-[1.75] text-foreground [&_h2]:scroll-mt-24 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:text-dz-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-dz-muted">
            {typeof children === "function" ? children(lang) : children}
            <footer className="border-t border-dz-glass-border pt-6 text-xs text-dz-muted">
              {lang === "kn" ? "ಕೊನೆಯ ನವೀಕರಣ" : "Last updated"}: {LEGAL_CONFIG.lastUpdated}.{" "}
              {lang === "kn" ? "ಆವೃತ್ತಿ" : "Version"}: {LEGAL_CONFIG.documentVersion}.
            </footer>
          </article>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

export function SensitiveDataCallout({
  children,
  badgeLabel = "Sensitive",
}: {
  children: ReactNode;
  badgeLabel?: string;
}) {
  return (
    <div className="border-l-4 border-dz-secondary bg-dz-secondary/10 px-4 py-3 text-sm">
      <span className="mr-2 rounded bg-dz-secondary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dz-secondary">
        {badgeLabel}
      </span>
      {children}
    </div>
  );
}
