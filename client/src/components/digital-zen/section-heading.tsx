import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  accent: string;
  subtitle?: string;
  className?: string;
  align?: "center" | "left";
}

export function SectionHeading({
  title,
  accent,
  subtitle,
  className,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-10 md:mb-12",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      <h2 className="font-display text-[clamp(1.875rem,5vw,3.25rem)] font-bold tracking-tight text-dz-primary">
        {title}{" "}
        <span className="font-accent italic font-normal text-dz-secondary">{accent}</span>
      </h2>
      {subtitle ? (
        <p className="mt-2.5 text-[clamp(0.9375rem,1.5vw,1.1875rem)] text-dz-muted max-w-2xl mx-auto">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
