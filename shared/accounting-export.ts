/**
 * SPEC-SESSIONS-01 Option B — CA export inputs (no in-app GL).
 * Amounts are suggested postings for external books (Tally/Zoho/etc.).
 */
import {
  computePerSessionAllocationRupees,
  roundAllocationPostingRupees,
} from "./programs";

export type SubscriptionAccrualInput = {
  subscriptionId: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  programId?: string | null;
  classTypeId?: string | null;
  classTypeName?: string | null;
  status?: string | null;
  /** Post-coupon paid amount in paise. Falls back to totalAmountPaise when null. */
  totalPaidPaise: number | null;
  totalAmountPaise?: number | null;
  sessionsPurchased: number | null;
  /** Legacy totalSessions when sessionsPurchased is unset. */
  totalSessions?: number | null;
  perSessionAllocation: string | null;
  sessionsConsumed: number;
  sessionsScheduled: number;
  sessionsUnscheduled: number;
  /** Refunded / lapsed entitlement (not a wallet). */
  sessionsCredited: number;
  horizonEndAt?: string | null;
  createdAt?: string | null;
};

export type SubscriptionAccrualExportRow = {
  subscriptionId: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  programId: string | null;
  classTypeId: string | null;
  classTypeName: string | null;
  status: string | null;
  totalPaidPaise: number;
  totalPaidRupees: string;
  sessionsPurchased: number;
  perSessionAllocation: string;
  sessionsConsumed: number;
  sessionsScheduled: number;
  sessionsUnscheduled: number;
  sessionsCredited: number;
  sessionsRemainingUndelivered: number;
  /** ROUND(consumed × allocation, 2) — suggested recognised revenue. */
  recognisedRevenueRupees: string;
  /** ROUND(credited × allocation, 2) — suggested refund / liability release. */
  refundedRupees: string;
  /** paid − recognised − refunded (2 dp). Contract liability remaining. */
  deferredLiabilityRupees: string;
  horizonEndAt: string | null;
  createdAt: string | null;
  /** Human memo for CA; not a journal entry. */
  suggestedMemo: string;
};

function toTwoDpRupeesFromPaise(paise: number): string {
  const safe = Math.max(0, Math.floor(paise));
  const rupees = Math.floor(safe / 100);
  const rem = safe % 100;
  return `${rupees}.${rem.toString().padStart(2, "0")}`;
}

/** Subtract two 2-dp rupee strings; floor at 0.00. */
export function subtractRupees2dp(minuend: string, subtrahend: string): string {
  const toPaise = (s: string): bigint => {
    const [w, f = ""] = s.replace(/,/g, "").split(".");
    const frac = (f + "00").slice(0, 2);
    return BigInt(w || "0") * 100n + BigInt(frac);
  };
  const diff = toPaise(minuend) - toPaise(subtrahend);
  const nonNeg = diff < 0n ? 0n : diff;
  const rupees = nonNeg / 100n;
  const paise = nonNeg % 100n;
  return `${rupees}.${paise.toString().padStart(2, "0")}`;
}

/**
 * Build one Option B export row from subscription counters + frozen allocation.
 * Missing allocation is recomputed from paid ÷ purchased when possible.
 */
export function buildSubscriptionAccrualExportRow(
  input: SubscriptionAccrualInput,
): SubscriptionAccrualExportRow | null {
  const paidPaise = Math.max(
    0,
    Math.floor(input.totalPaidPaise ?? input.totalAmountPaise ?? 0),
  );
  const purchased = Math.max(
    0,
    Math.floor(input.sessionsPurchased ?? input.totalSessions ?? 0),
  );
  if (purchased < 1 && paidPaise < 1) {
    return null;
  }
  const sessions = Math.max(1, purchased);

  let allocation = input.perSessionAllocation?.trim() || null;
  if (!allocation) {
    allocation = computePerSessionAllocationRupees({
      totalPaidPaise: paidPaise,
      sessionsPurchased: sessions,
    });
  }

  const consumed = Math.max(0, Math.floor(input.sessionsConsumed || 0));
  const scheduled = Math.max(0, Math.floor(input.sessionsScheduled || 0));
  const unscheduled = Math.max(0, Math.floor(input.sessionsUnscheduled || 0));
  const credited = Math.max(0, Math.floor(input.sessionsCredited || 0));
  const remaining = Math.max(0, sessions - consumed - credited);

  const recognised = roundAllocationPostingRupees(allocation, consumed);
  const refunded = roundAllocationPostingRupees(allocation, credited);
  const paidRupees = toTwoDpRupeesFromPaise(paidPaise);
  const deferred = subtractRupees2dp(subtractRupees2dp(paidRupees, recognised), refunded);

  return {
    subscriptionId: input.subscriptionId,
    userId: input.userId ?? null,
    userEmail: input.userEmail ?? null,
    userName: input.userName ?? null,
    programId: input.programId ?? null,
    classTypeId: input.classTypeId ?? null,
    classTypeName: input.classTypeName ?? null,
    status: input.status ?? null,
    totalPaidPaise: paidPaise,
    totalPaidRupees: paidRupees,
    sessionsPurchased: sessions,
    perSessionAllocation: allocation,
    sessionsConsumed: consumed,
    sessionsScheduled: scheduled,
    sessionsUnscheduled: unscheduled,
    sessionsCredited: credited,
    sessionsRemainingUndelivered: remaining,
    recognisedRevenueRupees: recognised,
    refundedRupees: refunded,
    deferredLiabilityRupees: deferred,
    horizonEndAt: input.horizonEndAt ?? null,
    createdAt: input.createdAt ?? null,
    suggestedMemo:
      `Option B export: paid ₹${paidRupees}; recognise ₹${recognised} ` +
      `(${consumed}×₹${allocation}); deferred ₹${deferred}; ` +
      `refunded/lapsed ₹${refunded} (${credited} sessions).`,
  };
}

export const SUBSCRIPTION_ACCRUAL_CSV_HEADERS = [
  "subscription_id",
  "user_email",
  "user_name",
  "program_id",
  "class_type_name",
  "status",
  "total_paid_rupees",
  "sessions_purchased",
  "per_session_allocation",
  "sessions_consumed",
  "sessions_scheduled",
  "sessions_unscheduled",
  "sessions_credited",
  "sessions_remaining_undelivered",
  "recognised_revenue_rupees",
  "refunded_rupees",
  "deferred_liability_rupees",
  "horizon_end_at",
  "created_at",
] as const;

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function subscriptionAccrualRowToCsvLine(row: SubscriptionAccrualExportRow): string {
  return [
    row.subscriptionId,
    row.userEmail,
    row.userName,
    row.programId,
    row.classTypeName,
    row.status,
    row.totalPaidRupees,
    row.sessionsPurchased,
    row.perSessionAllocation,
    row.sessionsConsumed,
    row.sessionsScheduled,
    row.sessionsUnscheduled,
    row.sessionsCredited,
    row.sessionsRemainingUndelivered,
    row.recognisedRevenueRupees,
    row.refundedRupees,
    row.deferredLiabilityRupees,
    row.horizonEndAt,
    row.createdAt,
  ]
    .map(csvEscape)
    .join(",");
}

export function formatSubscriptionAccrualCsv(rows: SubscriptionAccrualExportRow[]): string {
  const lines = [SUBSCRIPTION_ACCRUAL_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(subscriptionAccrualRowToCsvLine(row));
  }
  return `${lines.join("\n")}\n`;
}
