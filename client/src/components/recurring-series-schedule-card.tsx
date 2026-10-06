import { CalendarDays, Clock, User as UserIcon } from "lucide-react";
import { GlassCard } from "@/components/digital-zen/glass-card";
import {
  formatRecurringScheduleLine,
  formatRecurringWeekdayList,
  formatSeriesDurationWeeks,
  formatSessionLongDate,
  formatSessionTime,
  getRecurringWeekdays,
  type RecurringSessionLike,
} from "@/lib/recurring-series-display";

export function RecurringSeriesScheduleCard({
  session,
  instructorName,
  seriesStartDate,
  occurrenceCount,
}: {
  session: RecurringSessionLike;
  instructorName: string;
  seriesStartDate: Date | string;
  occurrenceCount?: number;
}) {
  const weekdays = getRecurringWeekdays(session);
  const dayLine = formatRecurringWeekdayList(weekdays);
  const scheduleLine = formatRecurringScheduleLine(session);
  const weeksLabel = formatSeriesDurationWeeks(session.seriesWeekCount);

  return (
    <GlassCard className="rounded-[22px] p-6">
      <h3 className="mb-1 font-display text-lg font-semibold">Your weekly schedule</h3>
      <p className="mb-5 text-sm text-muted-foreground">
        This is a recurring batch. Your spot covers the full series on the days below.
      </p>
      <dl className="space-y-4">
        {dayLine ? (
          <ScheduleRow
            icon={CalendarDays}
            label="Days"
            value={dayLine}
            detail={weeksLabel ? `Runs for ${weeksLabel}` : undefined}
          />
        ) : null}
        {session.date ? (
          <ScheduleRow icon={Clock} label="Time" value={formatSessionTime(session.date)} detail={scheduleLine} />
        ) : null}
        <ScheduleRow icon={UserIcon} label="Instructor" value={instructorName} />
        <ScheduleRow
          icon={CalendarDays}
          label="Starts"
          value={formatSessionLongDate(seriesStartDate)}
          detail={
            occurrenceCount && occurrenceCount > 1
              ? `${occurrenceCount} sessions in this batch`
              : undefined
          }
        />
      </dl>
    </GlassCard>
  );
}

function ScheduleRow({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-[18px] w-[18px] text-primary" />
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </dt>
        <dd className="text-[15px] font-semibold text-foreground">{value}</dd>
        {detail ? <dd className="mt-0.5 text-sm text-muted-foreground">{detail}</dd> : null}
      </div>
    </div>
  );
}
