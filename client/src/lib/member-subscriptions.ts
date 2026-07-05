import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import {
  formatSubscriptionUsage,
  subscriptionSessionBalance,
} from "@shared/member-session-counts";

export interface MemberSubscriptionSummary {
  id: string;
  classTypeName: string;
  subscriptionType: string;
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

export function formatMemberSubscriptionLine(sub: MemberSubscriptionSummary): string {
  const balance = subscriptionSessionBalance(sub);
  return `${sub.classTypeName}: ${formatSubscriptionUsage(balance)}`;
}
