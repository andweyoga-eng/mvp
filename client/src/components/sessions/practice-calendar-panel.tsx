import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { PRACTICE_WEEKDAYS } from "@/lib/practice-schedule";
import { cn } from "@/lib/utils";

export interface CalendarCell {
  day: number | null;
  dateKey?: string;
  hasSessions?: boolean;
  soldOut?: boolean;
  isToday?: boolean;
  thumbnailUrl?: string;
}

interface PracticeCalendarPanelProps {
  monthLabel: string;
  cells: CalendarCell[];
  calendarMonth: Date;
  onMonthChange: (month: Date) => void;
  onJumpToDay: (dateKey: string) => void;
}

export function PracticeCalendarPanel({
  monthLabel,
  cells,
  calendarMonth,
  onMonthChange,
  onJumpToDay,
}: PracticeCalendarPanelProps) {
  return (
    <GlassCard className="flex min-w-0 flex-col p-4 md:p-5" data-testid="practice-calendar-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-semibold">{monthLabel}</h3>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() =>
                onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-full text-dz-muted hover:bg-primary/5 hover:text-primary"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-full text-dz-muted hover:bg-primary/5 hover:text-primary"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
          }}
          className="rounded-full border border-primary/20 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          Today
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 border-b border-primary/5 pb-2 text-center">
        {PRACTICE_WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-[10px] font-semibold tracking-wider",
              i >= 5 ? "text-dz-secondary" : "text-dz-muted",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          if (cell.day == null) return <div key={i} className="min-h-[46px]" />;
          if (!cell.hasSessions) {
            return (
              <div
                key={i}
                className="flex min-h-[46px] flex-col items-center justify-start py-1"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                    cell.isToday ? "bg-primary font-semibold text-white" : "text-foreground",
                  )}
                >
                  {cell.day}
                </span>
              </div>
            );
          }
          return (
            <div key={i} className="flex min-h-[46px] flex-col items-center justify-start py-1">
              <button
                type="button"
                onClick={() => cell.dateKey && onJumpToDay(cell.dateKey)}
                className="group flex flex-col items-center gap-1"
                aria-label={`View sessions on ${monthLabel} ${cell.day}`}
                data-testid={`calendar-day-${cell.day}`}
              >
                <span
                  className={cn(
                    "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border text-sm font-semibold leading-none transition",
                    cell.isToday
                      ? "border-primary bg-primary text-white"
                      : "border-primary/40 text-foreground group-hover:border-primary",
                  )}
                >
                  {cell.thumbnailUrl && !cell.isToday ? (
                    <img
                      src={cell.thumbnailUrl}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
                    />
                  ) : null}
                  <span className="relative">{cell.day}</span>
                </span>
                {cell.soldOut ? (
                  <span className="text-[8px] font-bold uppercase tracking-wide text-destructive">
                    Sold out
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 border-t border-primary/5 pt-3 text-xs text-dz-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Tap a day to view its sessions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Sold out
        </span>
      </div>
    </GlassCard>
  );
}
