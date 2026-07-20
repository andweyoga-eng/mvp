import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { StrictNoToBlock } from "@/components/strict-no-to-block";
import { getSessionBadgeLabel, SESSION_INFO_BADGE_CLASSNAME } from "@/lib/session-badges";
import {
  formatPracticeTimeIST,
  instructorInitials,
  type PracticeSession,
} from "@/lib/practice-schedule";
import type { ScheduleDayLike } from "@/lib/booking-flow";
import { formatScheduleDayHeader, getRollingWeekDateRange } from "@shared/schedule-display";
import { cn } from "@/lib/utils";

interface WeeklySchedulePanelProps {
  days: ScheduleDayLike<PracticeSession>[];
  isLoading: boolean;
  highlightedDayKey: string | null;
  onHighlightDayKey: (key: string | null) => void;
  onReserve: (sessionId: string) => void;
  weeklyHeaderRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

export function WeeklySchedulePanel({
  days,
  isLoading,
  highlightedDayKey,
  onHighlightDayKey,
  onReserve,
  weeklyHeaderRefs,
}: WeeklySchedulePanelProps) {
  const rollingWeek = getRollingWeekDateRange();

  return (
    <GlassCard
      id="weekly-schedule"
      className="flex min-w-0 flex-col p-4 md:p-6"
      data-testid="weekly-schedule-panel"
    >
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Weekly Schedule</h3>
        <span className="text-xs font-medium text-dz-muted">Week {rollingWeek.weekNumber}</span>
      </div>
      <div className="max-h-[380px] flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : days.length > 0 ? (
          days.map((day) => {
            const dateKey = new Date(day.classes[0].date).toDateString();
            return (
              <div key={dateKey}>
                <div
                  ref={(el) => {
                    if (el) weeklyHeaderRefs.current.set(dateKey, el);
                    else weeklyHeaderRefs.current.delete(dateKey);
                  }}
                  className={cn(
                    "sticky top-0 z-[1] border-b border-primary/5 bg-white/90 py-2 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm transition-colors",
                    highlightedDayKey === dateKey && "rounded-md bg-primary/10 px-2",
                  )}
                >
                  {formatScheduleDayHeader(day.classes[0].date)}
                </div>
                {day.classes.map((cls) => {
                  const soldOut = cls.currentBookings >= cls.maxCapacity;
                  const badge = getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode);
                  return (
                    <div key={cls.id} className="border-b border-primary/5 py-2.5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-dz-secondary text-xs font-bold text-white">
                          {instructorInitials(cls.instructor.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "font-display text-sm font-semibold",
                              soldOut ? "text-dz-muted line-through" : "text-foreground",
                            )}
                          >
                            {cls.classType.name}
                          </div>
                          <div className="text-xs text-dz-muted">
                            {formatPracticeTimeIST(cls.date)} · {cls.instructor.name}
                          </div>
                        </div>
                        {badge ? (
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 whitespace-nowrap", SESSION_INFO_BADGE_CLASSNAME)}
                          >
                            {badge}
                          </Badge>
                        ) : null}
                        <Button
                          size="sm"
                          className="shrink-0 rounded-lg bg-primary text-xs font-semibold"
                          disabled={soldOut}
                          onClick={() => onReserve(cls.id)}
                          data-testid={`book-class-${cls.id}`}
                        >
                          {soldOut ? "Full" : "Book"}
                        </Button>
                      </div>
                      <StrictNoToBlock
                        strictNoTo={cls.classType.strictNoTo}
                        compact
                        alwaysShow={false}
                        className="mt-2 border-none pt-0 pl-12"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <p className="py-8 text-center text-sm text-dz-muted">No upcoming classes right now.</p>
        )}
      </div>
    </GlassCard>
  );
}
