import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { flexiTooltipCopy } from "@shared/flexi-mode";

export function FlexiInfoBadge({ className }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex", className)}>
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary"
            >
              Flexi
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-primary/25 text-[10px] leading-none">
                i
              </span>
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">
          <p>{flexiTooltipCopy()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
