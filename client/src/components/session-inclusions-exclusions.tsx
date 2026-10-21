import { useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  if (included.length === 0 && excluded.length === 0) return null;

  const title =
    included.length > 0 && excluded.length > 0
      ? "Inclusions and exclusions"
      : included.length > 0
        ? "Inclusions"
        : "Exclusions";

  return (
    <div
      className={cn("border-t border-primary/10 pt-4", className)}
      data-testid="session-inclusions-exclusions"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg py-0.5 text-left transition-colors hover:bg-primary/[0.03]"
        data-testid="session-inclusions-toggle"
      >
        <span className="font-display text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div id={panelId} className="mt-3 grid gap-4 sm:grid-cols-2">
          {included.length > 0 ? (
            <section data-testid="session-inclusions">
              {excluded.length > 0 ? (
                <h3 className="font-display text-sm font-semibold text-foreground">Inclusions</h3>
              ) : null}
              <ul className={cn("space-y-1.5", excluded.length > 0 && "mt-2")}>
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
              {included.length > 0 ? (
                <h3 className="font-display text-sm font-semibold text-foreground">Exclusions</h3>
              ) : null}
              <ul className={cn("space-y-1.5", included.length > 0 && "mt-2")}>
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
      ) : null}
    </div>
  );
}
