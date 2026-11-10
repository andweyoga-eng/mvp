import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function AccountComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-dz-secondary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-dz-secondary",
        className,
      )}
    >
      Coming Soon
    </span>
  );
}

interface AccountFoldSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  soon?: boolean;
  required?: boolean;
  nested?: boolean;
  summary?: ReactNode;
  className?: string;
  testId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AccountFoldSection({
  id,
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = false,
  forceOpen = false,
  soon,
  required,
  nested = false,
  summary,
  className,
  testId,
  open: controlledOpen,
  onOpenChange,
}: AccountFoldSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen || forceOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = forceOpen ? true : isControlled ? controlledOpen : uncontrolledOpen;

  useEffect(() => {
    if (forceOpen && !isControlled) {
      setUncontrolledOpen(true);
    }
  }, [forceOpen, isControlled]);

  const handleOpenChange = (next: boolean) => {
    if (forceOpen) return;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const shellClass = nested
    ? "rounded-xl border border-primary/15 bg-primary/[0.03] p-4"
    : "scroll-mt-36 md:scroll-mt-4 rounded-[20px] border border-primary/10 bg-white/80 p-5 shadow-[0_8px_30px_rgba(27,28,27,0.04)] backdrop-blur-xl sm:p-7";

  const titleClass = nested
    ? "font-display text-base font-semibold text-foreground"
    : "font-display text-xl font-semibold text-foreground";

  const subtitleClass = nested
    ? "mt-0.5 text-sm text-muted-foreground"
    : "mt-0.5 text-sm text-muted-foreground";

  const summaryClass = "mt-1.5 text-sm text-muted-foreground";

  const chevronClass = nested ? "h-5 w-5" : "h-7 w-7";

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <section id={id} className={cn(shellClass, className)} data-testid={testId}>
        <CollapsibleTrigger asChild disabled={forceOpen}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 text-left transition-colors",
              !forceOpen && "hover:opacity-90",
              forceOpen && "cursor-default",
            )}
            aria-expanded={isOpen}
          >
            {Icon ? (
              <div
                className={cn(
                  "grid shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
                  nested ? "h-8 w-8" : "h-10 w-10",
                )}
              >
                <Icon className={nested ? "h-4 w-4" : "h-5 w-5"} />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className={titleClass}>
                {title}
                {required ? <span className="ml-1 font-bold text-dz-secondary">*</span> : null}
              </h2>
              {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
              {!isOpen && summary ? <div className={summaryClass}>{summary}</div> : null}
            </div>
            {soon ? <AccountComingSoonBadge /> : null}
            {!forceOpen ? (
              <ChevronDown
                className={cn(
                  chevronClass,
                  "shrink-0 stroke-[2.75] text-primary transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            ) : null}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden">
          <div className={cn("bg-primary/10", nested ? "my-3 h-px" : "my-5 h-px")} />
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
