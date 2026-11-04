import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { resolveSessionTermsItems, type SessionTermsItem } from "@shared/session-terms";
import { cn } from "@/lib/utils";

interface SessionTermsBlockProps {
  termsAndConditions?: string | null;
  className?: string;
  /**
   * Checkout surfaces open terms on load. Ignored when `collapsible` is false
   * (terms always stay visible).
   */
  defaultExpanded?: boolean;
  /**
   * When false, terms are always shown in full with no collapse control — use at
   * payment / reserve checkout.
   */
  collapsible?: boolean;
  items?: SessionTermsItem[];
}

export function SessionTermsAcceptanceCopy({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      By continuing to payment, you agree to the session terms &amp; conditions above.
    </p>
  );
}

export function SessionTermsBlock({
  termsAndConditions,
  className,
  defaultExpanded = true,
  collapsible = true,
  items = [],
}: SessionTermsBlockProps) {
  const resolvedItems = resolveSessionTermsItems(termsAndConditions, items);
  const alwaysVisible = !collapsible;
  const [expanded, setExpanded] = useState(alwaysVisible || defaultExpanded);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const panelId = useId();

  useEffect(() => {
    if (alwaysVisible) {
      setExpanded(true);
      return;
    }
    setExpanded(defaultExpanded);
  }, [alwaysVisible, defaultExpanded, termsAndConditions]);

  const showPanel = alwaysVisible || expanded;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/12 bg-primary/[0.03] p-3",
        className,
      )}
      data-testid="session-terms-block"
    >
      <div className="flex items-start justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-0.5 text-left transition-colors hover:bg-primary/[0.03]"
            data-testid="session-terms-toggle"
          >
            <span className="text-sm font-semibold text-primary">Session terms &amp; conditions</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ) : (
          <p className="text-sm font-semibold text-primary">Session terms &amp; conditions</p>
        )}
      </div>

      {showPanel ? (
        <div
          id={panelId}
          className={cn(
            "mt-2 rounded-lg border border-primary/8 bg-white/60 p-3",
            collapsible && "max-h-[140px] overflow-y-auto",
          )}
          data-testid="session-terms-panel"
        >
          <div className="space-y-2">
            {resolvedItems.map((item) => {
              const itemExpanded = expandedKeys.includes(item.key);
              return (
                <div key={item.key} className="text-xs leading-relaxed text-muted-foreground">
                  <span>{item.summary} </span>
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() =>
                      setExpandedKeys((prev) =>
                        itemExpanded ? prev.filter((key) => key !== item.key) : [...prev, item.key],
                      )
                    }
                  >
                    {itemExpanded ? "show less" : "...more"}
                  </button>
                  {itemExpanded ? (
                    <p className="mt-1 whitespace-pre-wrap">{item.details}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
