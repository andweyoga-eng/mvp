import { Check, X } from "lucide-react";
import { parseSessionCoverageItems } from "@shared/session-inclusions";
import { cn } from "@/lib/utils";

export function SessionInclusionsExclusions({
  inclusions,
  exclusions,
  className,
}: {
  inclusions?: string | null;
  exclusions?: string | null;
  className?: string;
}) {
  const included = parseSessionCoverageItems(inclusions);
  const excluded = parseSessionCoverageItems(exclusions);
  if (included.length === 0 && excluded.length === 0) return null;

  return (
    <div
      className={cn("grid gap-4 border-t border-primary/10 pt-4 sm:grid-cols-2", className)}
      data-testid="session-inclusions-exclusions"
    >
      {included.length > 0 ? (
        <section data-testid="session-inclusions">
          <h3 className="font-display text-sm font-semibold text-foreground">Inclusions</h3>
          <ul className="mt-2 space-y-1.5">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-snug">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {excluded.length > 0 ? (
        <section data-testid="session-exclusions">
          <h3 className="font-display text-sm font-semibold text-foreground">Exclusions</h3>
          <ul className="mt-2 space-y-1.5">
            {excluded.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-snug">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-[#93000a]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
