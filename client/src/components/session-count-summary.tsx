import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  formatSessionCountSummary,
  formatSubscriptionUsage,
  subscriptionSessionBalance,
  type MemberSessionCountSummary,
} from "@shared/member-session-counts";
import type { MemberSubscriptionSummary } from "@/lib/member-subscriptions";

type NestSession = {
  id: string;
  className: string;
  status: string;
  date: string;
  instructorName: string;
  isLive?: boolean;
  isFlexi?: boolean;
};

function flexiBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
      Flexi
    </span>
  );
}

function groupSessionsByClassName(sessions: NestSession[]): Map<string, NestSession[]> {
  const map = new Map<string, NestSession[]>();
  for (const s of sessions) {
    const list = map.get(s.className) ?? [];
    list.push(s);
    map.set(s.className, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  return map;
}

function sessionStatusLabel(session: NestSession): string {
  if (session.isLive && session.status === "upcoming") return "Live";
  return session.status.charAt(0).toUpperCase() + session.status.slice(1);
}

function sessionStatusClass(status: string, isLive?: boolean): string {
  if (isLive && status === "upcoming") return "bg-primary/10 text-primary";
  if (status === "upcoming") return "bg-primary/10 text-primary";
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-muted text-muted-foreground";
}

function NestedSessionRow({ session }: { session: NestSession }) {
  const when = new Date(session.date);
  return (
    <li
      className="flex items-start justify-between gap-2 border-b border-primary/5 py-2 last:border-0"
      data-testid={`nested-session-${session.id}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">
          {format(when, "EEE, MMM d")} · {format(when, "h:mm a")}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">With {session.instructorName}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          sessionStatusClass(session.status, session.isLive),
        )}
      >
        {sessionStatusLabel(session)}
      </span>
    </li>
  );
}

function PackageNest({
  title,
  subtitle,
  sessions,
  isFlexi = false,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  sessions: NestSession[];
  isFlexi?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const nestSummary = useMemo(() => {
    const up = sessions.filter((s) => s.status === "upcoming").length;
    const done = sessions.filter((s) => s.status === "completed").length;
    const cancelled = sessions.filter((s) => s.status === "cancelled").length;
    return { up, done, cancelled, total: sessions.length };
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary">{title}</p>
          {isFlexi ? flexiBadge() : null}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">No session rows yet for this package.</p>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5 text-left transition-colors hover:bg-primary/[0.03]"
          data-testid={`package-nest-trigger-${title.replace(/\s+/g, "-").toLowerCase()}`}
        >
          <Package className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="block truncate text-sm font-semibold text-primary">{title}</span>
              {isFlexi ? flexiBadge() : null}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
          </span>
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
            {nestSummary.up} up · {nestSummary.done} done
            {nestSummary.cancelled > 0 ? ` · ${nestSummary.cancelled} cancelled` : ""}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <ul className="mt-1 rounded-xl border border-primary/10 bg-white/60 px-3 py-1">
          {sessions.map((s) => (
            <NestedSessionRow key={s.id} session={s} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PackageUsageCollapsible({
  summary,
  subscriptions,
  sessions,
  className,
}: {
  summary: MemberSessionCountSummary;
  subscriptions: MemberSubscriptionSummary[];
  sessions: NestSession[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const byClass = useMemo(() => groupSessionsByClassName(sessions), [sessions]);

  const matchedClassNames = new Set(activeSubs.map((s) => s.classTypeName));
  const orphanSessions = sessions.filter((s) => !matchedClassNames.has(s.className));

  if (summary.totalScheduled === 0 && activeSubs.length === 0) return null;

  const pillDetail =
    summary.totalScheduled > 0
      ? `${summary.totalScheduled} scheduled`
      : activeSubs.length > 0
        ? `${activeSubs.length} package${activeSubs.length === 1 ? "" : "s"}`
        : "";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(className)}
      data-testid="package-usage-collapsible"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex w-full items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-4 py-2.5 text-left shadow-sm transition-colors",
            "hover:bg-primary/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          )}
          data-testid="package-usage-pill"
        >
          <Package className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-primary">Package usage</span>
            <span className="block truncate text-xs text-muted-foreground">
              {pillDetail}
              {summary.totalScheduled > 0 && activeSubs.length > 0
                ? ` · ${activeSubs.length} active package${activeSubs.length === 1 ? "" : "s"}`
                : ""}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-primary/70 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-3 space-y-3 rounded-2xl border border-primary/10 bg-primary/[0.03] p-3">
          {summary.totalScheduled > 0 ? (
            <div className="rounded-xl bg-white/70 px-3 py-2 text-sm" data-testid="session-count-summary">
              <p className="font-medium">{formatSessionCountSummary(summary)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {summary.upcoming} upcoming + {summary.completed} completed + {summary.cancelled}{" "}
                cancelled = {summary.totalScheduled} total scheduled
              </p>
            </div>
          ) : null}

          {activeSubs.length > 0 ? (
            <div className="space-y-2" data-testid="subscription-usage-list">
              {activeSubs.map((sub) => {
                const balance = subscriptionSessionBalance(sub);
                const packageSessions = byClass.get(sub.classTypeName) ?? [];
                const purchased = sub.sessionsPurchased ?? sub.totalSessions;
                const programSubtitle =
                  sub.sessionsPurchased != null || sub.sessionsConsumed != null
                    ? `${purchased} purchased · ${sub.sessionsConsumed ?? 0} consumed · ${(sub.sessionsScheduled ?? 0) + (sub.sessionsUnscheduled ?? 0)} remaining · ${sub.subscriptionType.replace("_", " ")}`
                    : `${formatSubscriptionUsage(balance)} · ${sub.subscriptionType.replace("_", " ")} batch`;
                const horizon =
                  sub.horizonEndAt != null
                    ? ` · horizon ${new Date(sub.horizonEndAt).toLocaleDateString("en-IN")}`
                    : "";
                return (
                  <PackageNest
                    key={sub.id}
                    title={sub.classTypeName}
                    subtitle={`${programSubtitle}${horizon}`}
                    sessions={packageSessions}
                    isFlexi={!!sub.flexiBookingId}
                  />
                );
              })}
            </div>
          ) : null}

          {orphanSessions.length > 0 ? (
            <PackageNest
              title="Other sessions"
              subtitle={`${orphanSessions.length} session${orphanSessions.length === 1 ? "" : "s"} not linked to a package`}
              sessions={orphanSessions}
            />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
