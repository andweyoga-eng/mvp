import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import {
  formatSubscriptionUsage,
  subscriptionSessionBalance,
} from "@shared/member-session-counts";

export interface MemberSubscriptionSummary {
  id: string;
  classTypeId?: string;
  classTypeName: string;
  subscriptionType: string;
  flexiBookingId: string | null;
  programId?: string | null;
  instructorId?: string | null;
  sessionsPurchased?: number | null;
  totalPaidPaise?: number | null;
  sessionsConsumed?: number;
  sessionsScheduled?: number;
  sessionsUnscheduled?: number;
  sessionsCredited?: number;
  horizonStartAt?: string | null;
  horizonEndAt?: string | null;
  totalSessions: number;
  utilizedSessions: number;
  refundedSessions: number;
  disputedSessions: number;
  disputesResolved: number;
  waivedSessions: number;
  status: string;
  expiresAt: string | null;
}

export function memberSubscriptionsQueryKey(userId: string) {
  return ["/api/subscriptions/my", userId] as const;
}

export async function fetchMemberSubscriptions(): Promise<MemberSubscriptionSummary[]> {
  const res = await fetch("/api/subscriptions/my", {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const rows = await readResponseJson<MemberSubscriptionSummary[]>(res);
  if (!res.ok) throw new Error("Failed to load subscriptions");
  return rows;
}

/** Prefer Program ledger counters when present (A5 / Part B). */
export function formatMemberSubscriptionLine(sub: MemberSubscriptionSummary): string {
  const purchased = sub.sessionsPurchased ?? sub.totalSessions;
  if (
    sub.sessionsPurchased != null ||
    sub.sessionsConsumed != null ||
    sub.sessionsScheduled != null
  ) {
    const consumed = sub.sessionsConsumed ?? 0;
    const scheduled = sub.sessionsScheduled ?? 0;
    const unscheduled = sub.sessionsUnscheduled ?? 0;
    const credited = sub.sessionsCredited ?? 0;
    const remaining = scheduled + unscheduled;
    return (
      `${sub.classTypeName} (${sub.subscriptionType}): ` +
      `${purchased} purchased · ${consumed} consumed · ${remaining} remaining` +
      (credited > 0 ? ` · ${credited} credited` : "")
    );
  }
  const balance = subscriptionSessionBalance(sub);
  return `${sub.classTypeName}: ${formatSubscriptionUsage(balance)}`;
}
