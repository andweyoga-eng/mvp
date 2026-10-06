/**
 * SPEC-SESSIONS-01 Part C — move entitlement scheduled → unscheduled on platform cancel (FR-40).
 */
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  bookings,
  classes,
  payments,
  sessionLedger,
  subscriptions,
} from "@shared/schema";
import { computeRescheduleDeadline } from "@shared/cancellation-policy";

export type CancelEntitlementResult = {
  memberUnscheduled: number;
  guestRefundQueued: number;
  skipped: number;
  errors: number;
};

async function activeSubscriptionForUserClassType(params: {
  userId: string;
  classTypeId: string;
}) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, params.userId),
        eq(subscriptions.classTypeId, params.classTypeId),
        eq(subscriptions.status, "active"),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * After a class is cancelled: for each paid/waived booking, move one scheduled
 * session to unscheduled (members) or queue guest full-refund metadata.
 * Idempotent via UNIQUE (occurrence_id, event_type) on session_ledger.
 */
export async function applyCancelEntitlementsForClass(params: {
  classId: string;
  actor: string;
  reason: string;
  cancelAt?: Date;
}): Promise<CancelEntitlementResult> {
  const cancelAt = params.cancelAt ?? new Date();
  const result: CancelEntitlementResult = {
    memberUnscheduled: 0,
    guestRefundQueued: 0,
    skipped: 0,
    errors: 0,
  };

  const cls = await db
    .select({ id: classes.id, classTypeId: classes.classTypeId })
    .from(classes)
    .where(eq(classes.id, params.classId))
    .limit(1);
  const classRow = cls[0];
  if (!classRow) return result;

  const affected = await db
    .select({
      bookingId: bookings.id,
      userId: bookings.userId,
      paymentStatus: bookings.paymentStatus,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.classId, params.classId),
        or(eq(bookings.paymentStatus, "paid"), eq(bookings.paymentStatus, "waived")),
      ),
    );

  for (const row of affected) {
    try {
      if (!row.userId) {
        // Guest: full refund to source (FR-70). Mark payment for refund sweeper.
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.bookingId, row.bookingId))
          .orderBy(desc(payments.createdAt))
          .limit(1);
        if (payment && payment.status === "paid" && !payment.refundStatus) {
          await db
            .update(payments)
            .set({
              refundStatus: "pending_guest_full",
              refundAmountPaise: payment.amountPaise,
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
          result.guestRefundQueued += 1;
        } else {
          result.skipped += 1;
        }
        continue;
      }

      const sub = await activeSubscriptionForUserClassType({
        userId: row.userId,
        classTypeId: classRow.classTypeId,
      });
      if (!sub) {
        // Paid member booking without Program subscription — treat as single-session refund.
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.bookingId, row.bookingId))
          .orderBy(desc(payments.createdAt))
          .limit(1);
        if (payment && payment.status === "paid" && !payment.refundStatus) {
          await db
            .update(payments)
            .set({
              refundStatus: "pending_guest_full",
              refundAmountPaise: payment.amountPaise,
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
          result.guestRefundQueued += 1;
        } else {
          result.skipped += 1;
        }
        continue;
      }

      const occurrenceKey = `booking:${row.bookingId}`;
      try {
        await db.insert(sessionLedger).values({
          subscriptionId: sub.id,
          occurrenceId: occurrenceKey,
          eventType: "cancelled_by_admin",
          dScheduled: -1,
          dConsumed: 0,
          dUnscheduled: 1,
          dCredited: 0,
          valuePaise: 0,
          actor: params.actor,
          reason: params.reason.slice(0, 500),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/unique|duplicate/i.test(message)) {
          result.skipped += 1;
          continue;
        }
        throw err;
      }

      await db
        .update(subscriptions)
        .set({
          sessionsScheduled: sql`greatest(${subscriptions.sessionsScheduled} - 1, 0)`,
          sessionsUnscheduled: sql`${subscriptions.sessionsUnscheduled} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));

      // Store deadline hint on a companion ledger note (metadata via reason suffix is brittle);
      // deadline is recomputed from ledger created_at + horizon when sweeping.
      void computeRescheduleDeadline({
        cancelAt,
        horizonEndAt: sub.horizonEndAt,
      });

      result.memberUnscheduled += 1;
    } catch (err) {
      console.error("[cancel-entitlement]", row.bookingId, err);
      result.errors += 1;
    }
  }

  return result;
}
