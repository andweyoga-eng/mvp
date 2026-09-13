/**
 * SPEC-SESSIONS-01 Part B — entitlement sweeper.
 * Consumes elapsed scheduled occurrences (FR-30–FR-32).
 * Uses a Postgres advisory lock so multiple replicas do not double-run.
 */
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  bookings,
  classes,
  classTypes,
  sessionLedger,
  subscriptions,
  userSessionMappings,
} from "@shared/schema";

const SWEEPER_LOCK_KEY = 820_160_301; // arbitrary stable int

export type SessionLedgerSweepResult = {
  consumed: number;
  skipped: number;
  errors: number;
};

async function tryAdvisoryLock(): Promise<boolean> {
  const rows = await db.execute(
    sql`select pg_try_advisory_lock(${SWEEPER_LOCK_KEY}) as locked`,
  );
  const row = (rows as unknown as { rows?: Array<{ locked: boolean }> }).rows?.[0];
  return Boolean(row?.locked);
}

async function releaseAdvisoryLock(): Promise<void> {
  await db.execute(sql`select pg_advisory_unlock(${SWEEPER_LOCK_KEY})`);
}

/**
 * Write a consumed ledger event and update subscription cache counters.
 * Idempotent via UNIQUE (occurrence_id, event_type).
 */
async function consumeOccurrence(params: {
  subscriptionId: string;
  occurrenceId: string; // booking id or class id key
  classId: string;
}): Promise<"consumed" | "skipped"> {
  try {
    await db.insert(sessionLedger).values({
      subscriptionId: params.subscriptionId,
      occurrenceId: params.occurrenceId,
      eventType: "consumed",
      dScheduled: -1,
      dConsumed: 1,
      dUnscheduled: 0,
      dCredited: 0,
      valuePaise: 0,
      actor: "system",
      reason: "session_elapsed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(message)) {
      return "skipped";
    }
    throw err;
  }

  await db
    .update(subscriptions)
    .set({
      sessionsScheduled: sql`greatest(${subscriptions.sessionsScheduled} - 1, 0)`,
      sessionsConsumed: sql`${subscriptions.sessionsConsumed} + 1`,
      utilizedSessions: sql`${subscriptions.utilizedSessions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, params.subscriptionId));

  return "consumed";
}

/**
 * Find paid/waived bookings whose class end time has passed and that are not cancelled,
 * then write consumed events for the member's active subscription on that class type.
 */
export async function runSessionLedgerSweep(
  now: Date = new Date(),
): Promise<SessionLedgerSweepResult> {
  const locked = await tryAdvisoryLock();
  if (!locked) {
    return { consumed: 0, skipped: 0, errors: 0 };
  }

  const result: SessionLedgerSweepResult = { consumed: 0, skipped: 0, errors: 0 };

  try {
    const candidates = await db
      .select({
        bookingId: bookings.id,
        userId: bookings.userId,
        classId: bookings.classId,
        classTypeId: classes.classTypeId,
        classDate: classes.date,
        duration: classTypes.duration,
        mappingStatus: userSessionMappings.status,
        classStatus: classes.status,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
      .leftJoin(
        userSessionMappings,
        and(
          eq(userSessionMappings.classId, bookings.classId),
          eq(userSessionMappings.userId, bookings.userId),
        ),
      )
      .where(
        and(
          sql`${bookings.userId} is not null`,
          or(eq(bookings.paymentStatus, "paid"), eq(bookings.paymentStatus, "waived")),
          isNull(classes.cancelledAt),
          sql`coalesce(${classes.status}, 'published') <> 'cancelled'`,
        ),
      );

    for (const row of candidates) {
      try {
        if (!row.userId) continue;
        if (row.mappingStatus === "cancelled" || row.classStatus === "cancelled") {
          result.skipped += 1;
          continue;
        }
        const durationMinutes =
          typeof row.duration === "number" && row.duration > 0 ? row.duration : 60;
        const endMs = new Date(row.classDate).getTime() + durationMinutes * 60_000;
        if (endMs > now.getTime()) continue;

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, row.userId),
              eq(subscriptions.classTypeId, row.classTypeId),
              eq(subscriptions.status, "active"),
            ),
          )
          .orderBy(sql`${subscriptions.createdAt} desc`)
          .limit(1);

        if (!sub) {
          result.skipped += 1;
          continue;
        }

        const outcome = await consumeOccurrence({
          subscriptionId: sub.id,
          occurrenceId: row.bookingId,
          classId: row.classId,
        });
        if (outcome === "consumed") result.consumed += 1;
        else result.skipped += 1;
      } catch (err) {
        result.errors += 1;
        console.error("[session-ledger-sweep] row failed:", err);
      }
    }
  } finally {
    await releaseAdvisoryLock();
  }

  return result;
}
