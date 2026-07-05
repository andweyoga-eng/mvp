/**
 * One-off: hard-delete ALL scheduled/past sessions and session-related rows.
 *
 * Keeps: users, admins, class types, instructors, payment QR codes, waitlist, etc.
 *
 * Usage:
 *   npm run db:purge-all-sessions              # dry-run (counts only)
 *   npm run db:purge-all-sessions -- --dry-run # same as above
 *   npm run db:purge-all-sessions -- --confirm # execute deletion
 */
import "dotenv/config";
import { count, isNotNull, sql } from "drizzle-orm";
import { db, pool } from "../../server/db.ts";
import {
  bookings,
  carouselPromotions,
  classes,
  consentAuditLogs,
  payments,
  sessionJoinEvents,
  sessionMoodCheckins,
  subscriptions,
  userSessionMappings,
} from "../../shared/schema.ts";

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || !args.includes("--confirm");
  const confirm = args.includes("--confirm");
  return { dryRun, confirm };
}

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.password = parsed.password ? "***" : "";
    return `${parsed.protocol}//${parsed.username ? `${parsed.username}:***@` : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function countTable<T extends { id: unknown }>(table: T, label: string) {
  const [{ total }] = await db.select({ total: count() }).from(table);
  return { label, total: Number(total) };
}

async function main() {
  const { dryRun, confirm } = parseArgs();
  const connectionString =
    process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim() || "";

  if (!connectionString) {
    console.error("[purge-all-sessions] DATABASE_URL or DATABASE_PUBLIC_URL must be set.");
    process.exit(1);
  }

  console.log("[purge-all-sessions] Target database:", maskDatabaseUrl(connectionString));
  console.log(
    dryRun
      ? "[purge-all-sessions] DRY RUN — no rows will be deleted. Pass --confirm to execute."
      : "[purge-all-sessions] LIVE RUN — deleting all session data.",
  );

  const counts = await Promise.all([
    countTable(classes, "classes"),
    countTable(bookings, "bookings"),
    countTable(payments, "payments"),
    countTable(carouselPromotions, "carousel_promotions"),
    countTable(userSessionMappings, "user_session_mappings"),
    countTable(sessionMoodCheckins, "session_mood_checkins"),
    countTable(sessionJoinEvents, "session_join_events"),
  ]);

  const [{ linkedSubscriptions }] = await db
    .select({ linkedSubscriptions: count() })
    .from(subscriptions)
    .where(isNotNull(subscriptions.bookingId));

  const [{ bookingConsentLogs }] = await db
    .select({ bookingConsentLogs: count() })
    .from(consentAuditLogs)
    .where(isNotNull(consentAuditLogs.bookingId));

  console.log("[purge-all-sessions] Rows to remove or unlink:");
  for (const { label, total } of counts) {
    console.log(`  ${label}: ${total}`);
  }
  console.log(`  consent_audit_logs (booking-linked): ${Number(bookingConsentLogs)}`);
  console.log(`  subscriptions (booking_id → null): ${Number(linkedSubscriptions)}`);

  const sessionTotal = counts.find((c) => c.label === "classes")?.total ?? 0;
  if (sessionTotal === 0) {
    console.log("[purge-all-sessions] No sessions found — nothing to do.");
    return;
  }

  if (dryRun || !confirm) {
    console.log("[purge-all-sessions] Dry run complete. Re-run with --confirm to delete.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ bookingId: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(isNotNull(subscriptions.bookingId));

    await tx.delete(consentAuditLogs).where(isNotNull(consentAuditLogs.bookingId));
    await tx.delete(payments);
    await tx.delete(bookings);
    await tx.delete(carouselPromotions);
    await tx.delete(sessionMoodCheckins);
    await tx.delete(sessionJoinEvents);
    await tx.delete(userSessionMappings);
    await tx.delete(classes);
  });

  const [{ remainingSessions }] = await db.select({ remainingSessions: count() }).from(classes);
  const [{ remainingBookings }] = await db.select({ remainingBookings: count() }).from(bookings);

  console.log("[purge-all-sessions] Done.");
  console.log(`  remaining classes: ${Number(remainingSessions)}`);
  console.log(`  remaining bookings: ${Number(remainingBookings)}`);
  console.log("[purge-all-sessions] Users, admins, session types, and instructors were kept.");
}

main()
  .catch((err) => {
    console.error("[purge-all-sessions] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
