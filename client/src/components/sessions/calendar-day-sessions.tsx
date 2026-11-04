import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { StrictNoToBlock } from "@/components/strict-no-to-block";
import { getSessionBadgeLabel, SESSION_INFO_BADGE_CLASSNAME } from "@/lib/session-badges";
import {
  formatPracticeTimeIST,
  instructorInitials,
  type PracticeSession,
} from "@/lib/practice-schedule";
import { cn } from "@/lib/utils";

interface CalendarDaySessionsPanelProps {
  dateKey: string;
  sessions: PracticeSession[];
  onReserve: (sessionId: string) => void;
  onDismiss?: () => void;
}

export function CalendarDaySessionsPanel({
  dateKey,
  sessions,
  onReserve,
  onDismiss,
}: CalendarDaySessionsPanelProps) {
  const label = new Date(dateKey).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });

  return (
    <GlassCard
      className="flex min-w-0 flex-col p-4 md:p-5"
      data-testid="calendar-day-sessions"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{label}</h3>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            Close
          </button>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-dz-muted">No sessions on this day.</p>
      ) : (
        sessions.map((cls) => {
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
                  data-testid={`calendar-day-book-${cls.id}`}
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
        })
      )}
    </GlassCard>
  );
}
