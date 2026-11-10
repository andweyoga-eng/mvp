import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { flexiOptionsMatchFixedSlots, flexiTooltipCopy } from "@shared/flexi-mode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FlexiSelectionBuilder,
  type FlexiOption,
  type FlexiSelection,
} from "@/components/flexi-selection-builder";

export interface FlexiOptionsData {
  selectionCount: number;
  tooltip: string;
  options: FlexiOption[];
}

export type FlexiBookingMode = "series" | "flexi";

function noFlexiSwapsMessage(fixedSlotsLabel?: string): string {
  return `Oops, sorry. This one's already dialed in${fixedSlotsLabel ? ` (${fixedSlotsLabel})` : ""}. No Flexi swaps available. Book Fixed Slots to continue.`;
}

export function validateFlexiBeforeCheckout(params: {
  isLoading: boolean;
  isError: boolean;
  flexiOptions: FlexiOptionsData | undefined;
  selections: FlexiSelection[];
  fixedWeekdays?: number[];
  fixedTimeLabel?: string;
}): { ok: true } | { ok: false; title: string; description: string } {
  const { isLoading, isError, flexiOptions, selections, fixedWeekdays = [], fixedTimeLabel = "" } =
    params;
  if (isLoading) {
    return {
      ok: false,
      title: "Flexi options are loading",
      description: "Please wait a moment before continuing.",
    };
  }
  if (isError || !flexiOptions) {
    return {
      ok: false,
      title: "Couldn't load Flexi options",
      description: "Try again or switch back to Book Fixed Slots.",
    };
  }
  if (
    flexiOptions.options.length === 0 ||
    flexiOptionsMatchFixedSlots(
      fixedWeekdays,
      fixedTimeLabel,
      flexiOptions.selectionCount,
      flexiOptions.options,
    )
  ) {
    return {
      ok: false,
      title: "No Flexi swaps available",
      description: "Book Fixed Slots to continue with this schedule.",
    };
  }
  if (selections.length !== flexiOptions.selectionCount) {
    return {
      ok: false,
      title: "Complete your Flexi selection",
      description: `Choose exactly ${flexiOptions.selectionCount} slot${flexiOptions.selectionCount === 1 ? "" : "s"} before continuing.`,
    };
  }
  return { ok: true };
}

export function isFlexiCheckoutReady(params: {
  bookingMode: FlexiBookingMode;
  isLoading: boolean;
  isError: boolean;
  flexiOptions: FlexiOptionsData | undefined;
  selections: FlexiSelection[];
  fixedWeekdays?: number[];
  fixedTimeLabel?: string;
}): boolean {
  if (params.bookingMode !== "flexi") return true;
  return validateFlexiBeforeCheckout({
    isLoading: params.isLoading,
    isError: params.isError,
    flexiOptions: params.flexiOptions,
    selections: params.selections,
    fixedWeekdays: params.fixedWeekdays,
    fixedTimeLabel: params.fixedTimeLabel,
  }).ok;
}

function FlexiLoadingNotice({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-3"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
      <p className="text-sm font-semibold text-primary">{label}</p>
    </div>
  );
}

export function FlexiCheckoutSection({
  bookingMode,
  onBookingModeChange,
  flexiOptions,
  isLoading,
  isError,
  onRetry,
  selections,
  onSelectionsChange,
  fixedSlotsLabel,
  fixedWeekdays = [],
  fixedTimeLabel = "",
}: {
  bookingMode: FlexiBookingMode;
  onBookingModeChange: (mode: FlexiBookingMode) => void;
  flexiOptions: FlexiOptionsData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  selections: FlexiSelection[];
  onSelectionsChange: (next: FlexiSelection[]) => void;
  fixedSlotsLabel?: string;
  fixedWeekdays?: number[];
  fixedTimeLabel?: string;
}) {
  const flexiResolved = !isLoading && !isError && !!flexiOptions;
  const noAlternatives =
    flexiResolved &&
    (flexiOptions.options.length === 0 ||
      flexiOptionsMatchFixedSlots(
        fixedWeekdays,
        fixedTimeLabel,
        flexiOptions.selectionCount,
        flexiOptions.options,
      ));
  const flexiTooltip = flexiOptions?.tooltip ?? flexiTooltipCopy();

  useEffect(() => {
    if (noAlternatives && bookingMode === "flexi") {
      onBookingModeChange("series");
      onSelectionsChange([]);
    }
  }, [noAlternatives, bookingMode, onBookingModeChange, onSelectionsChange]);

  return (
    <div className="space-y-3 rounded-md border border-primary/15 bg-primary/[0.03] p-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1</p>
        <p className="text-sm font-medium">Choose how you want to book this package.</p>
      </div>
      <TooltipProvider delayDuration={150}>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={bookingMode === "series" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  onBookingModeChange("series");
                  onSelectionsChange([]);
                }}
              >
                Book Fixed Slots
              </Button>
            </TooltipTrigger>
            {fixedSlotsLabel ? (
              <TooltipContent>
                <p>{fixedSlotsLabel}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex flex-1">
                <Button
                  type="button"
                  variant={bookingMode === "flexi" ? "default" : "outline"}
                  className="flex-1 w-full"
                  disabled={noAlternatives}
                  onClick={() => onBookingModeChange("flexi")}
                >
                  Customise with Flexi
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{flexiTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      {fixedSlotsLabel ? (
        <p className="text-xs font-medium text-foreground">{fixedSlotsLabel}</p>
      ) : null}
      {noAlternatives ? (
        <p className="text-xs text-muted-foreground">{noFlexiSwapsMessage(fixedSlotsLabel)}</p>
      ) : null}
      {bookingMode === "flexi" && !noAlternatives ? (
        isLoading ? (
          <FlexiLoadingNotice label="Loading Flexi options…" />
        ) : isError || !flexiOptions ? (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">
              We couldn&apos;t load Flexi options for this schedule.{" "}
              {onRetry ? (
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => void onRetry()}
                >
                  Try again
                </button>
              ) : null}{" "}
              or switch back to Book Fixed Slots.
            </AlertDescription>
          </Alert>
        ) : (
          <FlexiSelectionBuilder
            selectionCount={flexiOptions.selectionCount}
            tooltip={flexiOptions.tooltip}
            options={flexiOptions.options}
            selections={selections}
            onChange={onSelectionsChange}
          />
        )
      ) : null}
    </div>
  );
}
