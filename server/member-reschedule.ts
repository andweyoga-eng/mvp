/**
 * SPEC-SESSIONS-01 FR-50 / FR-51 — member reschedule after platform cancel.
 */
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  bookings,
  classes,
  classTypes,
  instructors,
  sessionLedger,
  subscriptions,
  userSessionMappings,
} from "@shared/schema";
import { computeRescheduleWindow, sortRescheduleTargets } from "@shared/reschedule";
import { sessionIntervalMs } from "@shared/member-time-collision";
import { storage } from "./storage";

export type RescheduleTargetRow = {
  classId: string;
  classTypeId: string;
  classTypeName: string;
  instructorId: string;
  instructorName: string;
  date: string;
  durationMinutes: number;
  seatsRemaining: number;
  isOwnInstructor: boolean;
};

export type RescheduleConfirmResult =
  | { ok: true; bookingId: string; classId: string }
  | { ok: false; code: string; message: string };

async function latestCancelAt(subscriptionId: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: sessionLedger.createdAt })
    .from(sessionLedger)
    .where(
      and(
        eq(sessionLedger.subscriptionId, subscriptionId),
        eq(sessionLedger.eventType, "cancelled_by_admin"),
      ),
    )
    .orderBy(desc(sessionLedger.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

export async function listRescheduleTargets(params: {
  userId: string;
  subscriptionId: string;
  now?: Date;
}): Promise<
  | { ok: true; targets: RescheduleTargetRow[]; windowEnd: string; unscheduled: number }
  | { ok: false; code: string; message: string }
> {
  const now = params.now ?? new Date();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.id, params.subscriptionId), eq(subscriptions.userId, params.userId)),
    )
    .limit(1);
  if (!sub) {
    return { ok: false, code: "SUBSCRIPTION_NOT_FOUND", message: "Subscription not found." };
  }
  if ((sub.sessionsUnscheduled ?? 0) < 1) {
    return {
      ok: false,
      code: "NO_UNSCHEDULED",
      message: "No reschedulable entitlement on this package.",
    };
  }

  const cancelAt = (await latestCancelAt(sub.id)) ?? now;
  const window = computeRescheduleWindow({
    cancelAt,
    horizonStartAt: sub.horizonStartAt,
    horizonEndAt: sub.horizonEndAt,
    now,
  });
  if (!window.open) {
    return {
      ok: false,
      code: "WINDOW_CLOSED",
      message: "The reschedule window has ended. A refund will be processed if still due.",
    };
  }

  const candidates = await db
    .select({
      id: classes.id,
      classTypeId: classes.classTypeId,
      classTypeName: classTypes.name,
      instructorId: classes.instructorId,
      instructorName: instructors.name,
      date: classes.date,
      duration: classTypes.duration,
      maxCapacity: classes.maxCapacity,
      status: classes.status,
      pausedAt: classes.pausedAt,
      cancelledAt: classes.cancelledAt,
      publishedAt: classes.publishedAt,
    })
    .from(classes)
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .innerJoin(instructors, eq(classes.instructorId, instructors.id))
    .where(
      and(
        eq(classes.classTypeId, sub.classTypeId),
        gte(classes.date, window.windowStart),
        lte(classes.date, window.windowEnd),
        sql`${classes.cancelledAt} is null`,
        sql`${classes.pausedAt} is null`,
        sql`${classes.status} not in ('paused', 'cancelled', 'draft')`,
      ),
    )
    .orderBy(classes.date);

  const counts = await storage.getActiveBookingCountsForClasses(candidates.map((c) => c.id));
  const withSeats = candidates.filter((c) => {
    const active = counts.get(c.id) ?? 0;
    return active < c.maxCapacity && c.date.getTime() > now.getTime();
  });

  const durationByClass = new Map(withSeats.map((c) => [c.id, c.duration ?? 60]));
  const proposed = withSeats.map((c) => {
    const duration = durationByClass.get(c.id) ?? 60;
    const interval = sessionIntervalMs(c.date, duration);
    return {
      classId: c.id,
      startMs: interval.startMs,
      endMs: interval.endMs,
      label: c.classTypeName,
    };
  });

  const collisions = await storage.findMemberTimeCollisions({
    userId: params.userId,
    proposed,
  });
  const blocked = new Set(collisions.map((c) => c.proposedClassId));

  const eligible = withSeats.filter((c) => !blocked.has(c.id));
  const sorted = sortRescheduleTargets(
    eligible.map((c) => ({
      ...c,
      instructorId: c.instructorId,
      date: c.date,
    })),
    sub.instructorId,
  );

  return {
    ok: true,
    unscheduled: sub.sessionsUnscheduled,
    windowEnd: window.windowEnd.toISOString(),
    targets: sorted.map((c) => {
      const active = counts.get(c.id) ?? 0;
      return {
        classId: c.id,
        classTypeId: c.classTypeId,
        classTypeName: c.classTypeName,
        instructorId: c.instructorId,
        instructorName: c.instructorName,
        date: c.date.toISOString(),
        durationMinutes: c.duration ?? 60,
        seatsRemaining: Math.max(0, c.maxCapacity - active),
        isOwnInstructor: c.instructorId === sub.instructorId,
      };
    }),
  };
}

export async function confirmReschedule(params: {
  userId: string;
  subscriptionId: string;
  targetClassId: string;
  sourceBookingId?: string | null;
  now?: Date;
}): Promise<RescheduleConfirmResult> {
  const now = params.now ?? new Date();
  const listed = await listRescheduleTargets({
    userId: params.userId,
    subscriptionId: params.subscriptionId,
    now,
  });
  if (!listed.ok) {
    return { ok: false, code: listed.code, message: listed.message };
  }
  if (!listed.targets.some((t) => t.classId === params.targetClassId)) {
    return {
      ok: false,
      code: "TARGET_UNAVAILABLE",
      message: "That session is no longer available. Pick another slot.",
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, params.subscriptionId),
            eq(subscriptions.userId, params.userId),
          ),
        )
        .for("update")
        .limit(1);
      if (!sub || (sub.sessionsUnscheduled ?? 0) < 1) {
        throw new Error("NO_UNSCHEDULED");
      }

      const [locked] = await tx
        .select({
          id: classes.id,
          classTypeId: classes.classTypeId,
          maxCapacity: classes.maxCapacity,
          date: classes.date,
          cancelledAt: classes.cancelledAt,
          pausedAt: classes.pausedAt,
          status: classes.status,
        })
        .from(classes)
        .where(eq(classes.id, params.targetClassId))
        .for("update")
        .limit(1);
      if (!locked || locked.classTypeId !== sub.classTypeId) {
        throw new Error("TARGET_MISSING");
      }
      if (locked.cancelledAt || locked.pausedAt || locked.status === "draft") {
        throw new Error("TARGET_UNAVAILABLE");
      }

      const counts = await storage.getActiveBookingCountsForClasses([params.targetClassId]);
      const active = counts.get(params.targetClassId) ?? 0;
      if (active + 1 > locked.maxCapacity) {
        throw new Error("SLOT_FULL");
      }

      const [created] = await tx
        .insert(bookings)
        .values({
          userId: params.userId,
          classId: params.targetClassId,
          paymentStatus: "paid",
          paymentMethod: "razorpay_link",
        })
        .returning();

      const [existingMap] = await tx
        .select({ id: userSessionMappings.id })
        .from(userSessionMappings)
        .where(
          and(
            eq(userSessionMappings.userId, params.userId),
            eq(userSessionMappings.classId, params.targetClassId),
          ),
        )
        .limit(1);
      if (!existingMap) {
        await tx.insert(userSessionMappings).values({
          userId: params.userId,
          classId: params.targetClassId,
          status: "upcoming",
        });
      }

      await tx.insert(sessionLedger).values({
        subscriptionId: sub.id,
        occurrenceId: `booking:${created.id}`,
        eventType: "rescheduled_in",
        dScheduled: 1,
        dConsumed: 0,
        dUnscheduled: -1,
        dCredited: 0,
        valuePaise: 0,
        actor: params.userId,
        reason: params.sourceBookingId
          ? `reschedule_from:${params.sourceBookingId}`
          : "member_reschedule",
      });

      await tx
        .update(subscriptions)
        .set({
          sessionsUnscheduled: sql`greatest(${subscriptions.sessionsUnscheduled} - 1, 0)`,
          sessionsScheduled: sql`${subscriptions.sessionsScheduled} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));

      await tx
        .update(classes)
        .set({ currentBookings: sql`${classes.currentBookings} + 1` })
        .where(eq(classes.id, params.targetClassId));

      return { bookingId: created.id, classId: params.targetClassId };
    });

    return { ok: true, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "SLOT_FULL") {
      return {
        ok: false,
        code: "SLOT_FULL",
        message: "That session just filled. Pick another slot.",
      };
    }
    if (message === "NO_UNSCHEDULED") {
      return {
        ok: false,
        code: "NO_UNSCHEDULED",
        message: "No reschedulable entitlement left on this package.",
      };
    }
    if (message === "TARGET_MISSING" || message === "TARGET_UNAVAILABLE") {
      return {
        ok: false,
        code: "TARGET_UNAVAILABLE",
        message: "That session is no longer available. Pick another slot.",
      };
    }
    if (/unique|duplicate/i.test(message)) {
      return {
        ok: false,
        code: "ALREADY_APPLIED",
        message: "This reschedule was already applied.",
      };
    }
    console.error("[reschedule] confirm failed:", err);
    return { ok: false, code: "RESCHEDULE_FAILED", message: "Could not reschedule. Try again." };
  }
}
