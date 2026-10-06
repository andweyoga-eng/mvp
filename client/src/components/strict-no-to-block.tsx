import { useEffect, useId, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { formatStrictNoToSummary, parseStrictNoToTags } from "@/lib/strict-no-to";
import { TeamContactSheet } from "@/components/team-contact-sheet";
import { cn } from "@/lib/utils";

interface StrictNoToBlockProps {
  strictNoTo?: string | null;
  compact?: boolean;
  className?: string;
  /** Render the row even when there are no contraindications. Default true. */
  alwaysShow?: boolean;
  /** Initial expanded state — true on checkout/reserve, false on browse cards. */
  defaultExpanded?: boolean;
}

export function StrictNoToBlock({
  strictNoTo,
  compact = false,
  className,
  alwaysShow = true,
  defaultExpanded,
}: StrictNoToBlockProps) {
  const tags = parseStrictNoToTags(strictNoTo);
  const initiallyExpanded = defaultExpanded ?? !compact;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [contactOpen, setContactOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setExpanded(defaultExpanded ?? !compact);
  }, [strictNoTo, defaultExpanded, compact]);

  if (!alwaysShow && tags.length === 0) return null;

  const summary = formatStrictNoToSummary(tags.length);
  const showTeamContact = expanded && (!compact || (defaultExpanded ?? false));

  return (
    <>
      <div
        className={cn(
          "border-t border-primary/10",
          compact ? "pt-3" : "pt-4",
          className,
        )}
        data-testid="strict-no-to-block"
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((open) => !open)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-0.5 text-left transition-colors hover:bg-primary/[0.03]"
            data-testid="strict-no-to-toggle"
          >
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                Not suitable
              </span>
              {!expanded ? (
                <span
                  className={cn(
                    "truncate text-xs",
                    tags.length === 0
                      ? "font-normal text-muted-foreground"
                      : "font-medium text-[#93000a]",
                  )}
                  data-testid="strict-no-to-summary"
                >
                  · {summary}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {showTeamContact ? (
            <button
              type="button"
              title="Contact our team"
              onClick={() => setContactOpen(true)}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary transition-colors hover:bg-primary/15"
              data-testid="strict-no-to-contact"
            >
              <MessageCircle className="h-[17px] w-[17px]" />
            </button>
          ) : null}
        </div>

        {expanded ? (
          <div id={panelId} className="mt-2" data-testid="strict-no-to-panel">
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-testid="strict-no-to-empty">
                None
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(186,26,26,0.07)",
                      borderColor: "rgba(186,26,26,0.16)",
                      color: "#93000a",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {showTeamContact && !compact ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Not on the list? Tap the icon to check with our team.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <TeamContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
