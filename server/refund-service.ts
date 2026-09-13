/**
 * SPEC-SESSIONS-01 Part C — refund to source (FR-60 / FR-70 / FR-61).
 * Initiate async Razorpay refunds; mark complete only on refund.processed webhook.
 */
import { and, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  payments,
  sessionLedger,
  subscriptions,
} from "@shared/schema";
import {
  computeRescheduleDeadline,
  rupees2dpToPaise,
} from "@shared/cancellation-policy";
import { roundAllocationPostingRupees } from "@shared/programs";
import { createRazorpayRefund, isRazorpayConfigured } from "./razorpay";

export type RefundSweepResult = {
  guestInitiated: number;
  memberLapsed: number;
  manualRequired: number;
  skipped: number;
  errors: number;
};

async function initiateGatewayRefund(params: {
  payment: typeof payments.$inferSelect;
  amountPaise: number;
  reason: string;
}): Promise<"initiated" | "manual_required" | "skipped"> {
  if (params.payment.refundStatus === "initiated" || params.payment.refundStatus === "processed") {
    return "skipped";
  }
  if (params.amountPaise <= 0) {
    await db
      .update(payments)
      .set({
        refundStatus: "processed",
        refundAmountPaise: 0,
        refundProcessedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, params.payment.id));
    return "skipped";
  }

  const gatewayPaymentId = params.payment.razorpayPaymentId;
  if (!gatewayPaymentId || !isRazorpayConfigured()) {
    await db
      .update(payments)
      .set({
        refundStatus: "manual_required",
        refundAmountPaise: params.amountPaise,
        refundInitiatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, params.payment.id));
    return "manual_required";
  }

  try {
    const refund = await createRazorpayRefund({
      paymentId: gatewayPaymentId,
      amountPaise: params.amountPaise,
      notes: { reason: params.reason.slice(0, 100) },
    });
    await db
      .update(payments)
      .set({
        refundStatus: "initiated",
        razorpayRefundId: refund.id,
        refundAmountPaise: params.amountPaise,
        refundInitiatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, params.payment.id));
    return "initiated";
  } catch (err) {
    console.error("[refund] Razorpay initiate failed:", err);
    await db
      .update(payments)
      .set({
        refundStatus: "manual_required",
        refundAmountPaise: params.amountPaise,
        refundInitiatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, params.payment.id));
    return "manual_required";
  }
}

/** Confirm refund after gateway webhook (FR-61). */
export async function markRefundProcessed(params: {
  razorpayRefundId?: string | null;
  razorpayPaymentId?: string | null;
}): Promise<boolean> {
  let payment: typeof payments.$inferSelect | undefined;
  if (params.razorpayRefundId) {
    const [row] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayRefundId, params.razorpayRefundId))
      .limit(1);
    payment = row;
  }
  if (!payment && params.razorpayPaymentId) {
    const [row] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayPaymentId, params.razorpayPaymentId))
      .limit(1);
    payment = row;
  }
  if (!payment) return false;

  await db
    .update(payments)
    .set({
      status: "refunded",
      refundStatus: "processed",
      refundProcessedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));
  return true;
}

async function lapseUnscheduledSubscription(sub: typeof subscriptions.$inferSelect, now: Date) {
  const n = Math.max(0, sub.sessionsUnscheduled ?? 0);
  if (n < 1) return null;

  const [latestCancel] = await db
    .select({ createdAt: sessionLedger.createdAt })
    .from(sessionLedger)
    .where(
      and(
        eq(sessionLedger.subscriptionId, sub.id),
        eq(sessionLedger.eventType, "cancelled_by_admin"),
      ),
    )
    .orderBy(desc(sessionLedger.createdAt))
    .limit(1);

  if (!latestCancel) return null;

  const deadline = computeRescheduleDeadline({
    cancelAt: latestCancel.createdAt,
    horizonEndAt: sub.horizonEndAt,
  });
  if (deadline.getTime() > now.getTime()) return null;

  const allocation = sub.perSessionAllocation ?? "0.00000000";
  const refundRupees = roundAllocationPostingRupees(String(allocation), n);
  const refundPaise = rupees2dpToPaise(refundRupees);

  const occurrenceKey = `sub:${sub.id}:lapse:${deadline.toISOString().slice(0, 10)}`;
  try {
    await db.insert(sessionLedger).values({
      subscriptionId: sub.id,
      occurrenceId: occurrenceKey,
      eventType: "refunded",
      dScheduled: 0,
      dConsumed: 0,
      dUnscheduled: -n,
      dCredited: n,
      valuePaise: refundPaise,
      actor: "system",
      reason: "reschedule_deadline_lapse",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(message)) return "skipped";
    throw err;
  }

  await db
    .update(subscriptions)
    .set({
      sessionsUnscheduled: 0,
      sessionsCredited: sql`${subscriptions.sessionsCredited} + ${n}`,
      refundedSessions: sql`${subscriptions.refundedSessions} + ${n}`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  return { refundPaise, n, refundRupees };
}

/**
 * Process guest full-refund queue + member reschedule-deadline lapses.
 */
export async function runRefundSweep(now: Date = new Date()): Promise<RefundSweepResult> {
  const result: RefundSweepResult = {
    guestInitiated: 0,
    memberLapsed: 0,
    manualRequired: 0,
    skipped: 0,
    errors: 0,
  };

  const guestPending = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.status, "paid"),
        inArray(payments.refundStatus, ["pending_guest_full"]),
      ),
    );

  for (const payment of guestPending) {
    try {
      const outcome = await initiateGatewayRefund({
        payment,
        amountPaise: payment.refundAmountPaise ?? payment.amountPaise,
        reason: "guest_platform_cancel_full_refund",
      });
      if (outcome === "initiated") result.guestInitiated += 1;
      else if (outcome === "manual_required") result.manualRequired += 1;
      else result.skipped += 1;
    } catch (err) {
      result.errors += 1;
      console.error("[refund-sweep] guest", payment.id, err);
    }
  }

  const openSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.status, "active"), gt(subscriptions.sessionsUnscheduled, 0)),
    );

  for (const sub of openSubs) {
    try {
      const lapsed = await lapseUnscheduledSubscription(sub, now);
      if (!lapsed || lapsed === "skipped") {
        if (lapsed === "skipped") result.skipped += 1;
        continue;
      }

      // Prefer a paid payment for this user; partial refund of allocation × n.
      const [payment] = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.userId, sub.userId),
            eq(payments.status, "paid"),
            isNotNull(payments.razorpayPaymentId),
            or(
              isNull(payments.refundStatus),
              sql`${payments.refundStatus} not in ('initiated', 'processed', 'pending_guest_full')`,
            ),
          ),
        )
        .orderBy(desc(payments.paidAt), desc(payments.createdAt))
        .limit(1);

      if (!payment) {
        if (lapsed.refundPaise > 0) {
          result.manualRequired += 1;
        } else {
          result.memberLapsed += 1;
        }
        continue;
      }

      const outcome = await initiateGatewayRefund({
        payment,
        amountPaise: Math.min(lapsed.refundPaise, payment.amountPaise),
        reason: `reschedule_deadline_lapse_${lapsed.n}`,
      });
      result.memberLapsed += 1;
      if (outcome === "manual_required") result.manualRequired += 1;
    } catch (err) {
      result.errors += 1;
      console.error("[refund-sweep] member", sub.id, err);
    }
  }

  return result;
}
