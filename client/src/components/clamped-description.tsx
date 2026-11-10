import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ClampedDescriptionProps {
  text: string;
  className?: string;
  /** Tailwind line-clamp classes when collapsed */
  clampClassName?: string;
  moreLabel?: string;
  lessLabel?: string;
  testId?: string;
}

/**
 * Truncates long copy with a subtle "Read more" toggle — used on discovery cards.
 */
export function ClampedDescription({
  text,
  className,
  clampClassName = "line-clamp-2 md:line-clamp-3",
  moreLabel = "Read more",
  lessLabel = "Show less",
  testId,
}: ClampedDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const panelId = useId();

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    const check = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded, clampClassName]);

  if (!text.trim()) return null;

  return (
    <div className={className}>
      <p
        ref={bodyRef}
        id={panelId}
        className={cn(
          "text-sm leading-relaxed text-dz-muted",
          !expanded && clampClassName,
        )}
        data-testid={testId}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="mt-1.5 text-xs font-semibold text-primary hover:underline"
          data-testid={testId ? `${testId}-toggle` : undefined}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
