import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCompactRecurringWeekdayList } from "@/lib/recurring-series-display";

export interface FlexiOption {
  weekday: number;
  weekdayLabel: string;
  sourceSeriesId: string;
  sourceClassId: string;
  timeLabel: string;
  capacityAvailable: boolean;
  sourceSetWeekdays?: number[];
}

export interface FlexiSelection extends Omit<FlexiOption, "capacityAvailable"> {}

export function FlexiSelectionBuilder({
  selectionCount,
  tooltip,
  options,
  selections,
  onChange,
}: {
  selectionCount: number;
  tooltip: string;
  options: FlexiOption[];
  selections: FlexiSelection[];
  onChange: (next: FlexiSelection[]) => void;
}) {
  const grouped = options.reduce<Record<string, FlexiOption[]>>((acc, option) => {
    const key = option.sourceSeriesId;
    acc[key] = [...(acc[key] ?? []), option].sort((a, b) => a.weekday - b.weekday);
    return acc;
  }, {});

  function toggle(option: FlexiOption) {
    const existing = selections.find((item) => item.weekday === option.weekday);
    if (existing?.sourceClassId === option.sourceClassId) {
      onChange(selections.filter((item) => item.weekday !== option.weekday));
      return;
    }
    const withoutWeekday = selections.filter((item) => item.weekday !== option.weekday);
    const next = [
      ...withoutWeekday,
      {
        weekday: option.weekday,
        weekdayLabel: option.weekdayLabel,
        sourceSeriesId: option.sourceSeriesId,
        sourceClassId: option.sourceClassId,
        timeLabel: option.timeLabel,
      },
    ];
    onChange(next.slice(0, selectionCount));
  }

  return (
    <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">Flexi Mode</p>
        <p className="text-xs text-muted-foreground">{tooltip}</p>
        <p className="text-xs text-muted-foreground">
          Pick {selectionCount} weekly slot{selectionCount === 1 ? "" : "s"} from any of the
          schedule sets below. You need one slot for each practice day in your chosen package.
        </p>
      </div>
      {Object.entries(grouped).map(([sourceSeriesId, weekdayOptions], index) => {
        const weekdaySet =
          weekdayOptions[0]?.sourceSetWeekdays ?? weekdayOptions.map((o) => o.weekday);
        const scheduleLabel = formatCompactRecurringWeekdayList(weekdaySet);
        const timeLabels = [...new Set(weekdayOptions.map((option) => option.timeLabel))];
        return (
          <div key={sourceSeriesId} className="space-y-2 rounded-md border bg-background p-3">
            <div>
              <p className="text-sm font-semibold">Set {index + 1}</p>
              <p className="text-xs text-muted-foreground">
                {scheduleLabel}
                {timeLabels.length ? ` · ${timeLabels.join(" / ")}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {weekdayOptions.map((option) => {
                const selected = selections.some(
                  (item) =>
                    item.weekday === option.weekday && item.sourceClassId === option.sourceClassId,
                );
                const disabled =
                  !option.capacityAvailable || (!selected && selections.length >= selectionCount);
                return (
                  <Button
                    key={`${option.weekday}-${option.sourceClassId}`}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => toggle(option)}
                    aria-pressed={selected}
                    className={cn(
                      "justify-start",
                      selected && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {option.weekdayLabel} · {option.timeLabel}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
      {selections.length > 0 ? (
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your selection
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {selections.map((selection) => (
              <li key={`${selection.weekday}-${selection.sourceClassId}`}>
                {selection.weekdayLabel} · {selection.timeLabel}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
