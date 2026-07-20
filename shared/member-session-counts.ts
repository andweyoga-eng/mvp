/** Member session rows grouped by display status (Sessions tab). */
export type MemberSessionStatus = "upcoming" | "completed" | "cancelled";

export interface MemberSessionCountSummary {
  upcoming: number;
  completed: number;
  cancelled: number;
  /** upcoming + completed + cancelled */
  totalScheduled: number;
}

export interface SubscriptionSessionBalance {
  totalSessions: number;
  utilizedSessions: number;
  refundedSessions: number;
  waivedSessions: number;
  /** Sessions not yet used or written off (excludes refunded/waived). */
  remaining: number;
}

export function summarizeMemberSessionStatuses(
  sessions: ReadonlyArray<{ status: string }>,
): MemberSessionCountSummary {
  let upcoming = 0;
  let completed = 0;
  let cancelled = 0;
  for (const s of sessions) {
    if (s.status === "upcoming") upcoming += 1;
    else if (s.status === "completed") completed += 1;
    else if (s.status === "cancelled") cancelled += 1;
  }
  return {
    upcoming,
    completed,
    cancelled,
    totalScheduled: upcoming + completed + cancelled,
  };
}

/** Validates tab counts reconcile to the scheduled total. */
export function memberSessionCountsBalance(summary: MemberSessionCountSummary): boolean {
  return summary.totalScheduled === summary.upcoming + summary.completed + summary.cancelled;
}

export function subscriptionSessionBalance(input: {
  totalSessions: number;
  utilizedSessions: number;
  refundedSessions?: number;
  waivedSessions?: number;
}): SubscriptionSessionBalance {
  const refundedSessions = input.refundedSessions ?? 0;
  const waivedSessions = input.waivedSessions ?? 0;
  const remaining = Math.max(
    0,
    input.totalSessions - input.utilizedSessions - refundedSessions - waivedSessions,
  );
  return {
    totalSessions: input.totalSessions,
    utilizedSessions: input.utilizedSessions,
    refundedSessions,
    waivedSessions,
    remaining,
  };
}

export function formatSessionCountSummary(summary: MemberSessionCountSummary): string {
  if (summary.totalScheduled === 0) return "No sessions booked yet";
  const parts = [
    `${summary.totalScheduled} scheduled`,
    `${summary.completed} completed`,
    `${summary.upcoming} upcoming`,
  ];
  if (summary.cancelled > 0) parts.push(`${summary.cancelled} cancelled`);
  return parts.join(" · ");
}

export function formatSubscriptionUsage(balance: SubscriptionSessionBalance): string {
  const base = `${balance.utilizedSessions} of ${balance.totalSessions} completed`;
  if (balance.remaining > 0) return `${base} · ${balance.remaining} remaining`;
  return base;
}
