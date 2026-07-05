/**
 * Remove auto-seeded demo catalogue and integration-test fixtures
 * so QA starts from a clean admin-created slate.
 *
 * Keeps: super-admin accounts, real admin-created session types/instructors/sessions,
 * production payment QR codes, and member accounts not matching test email patterns.
 *
 * Usage: npm run db:purge-seed
 * Runs automatically after: npm run db:push
 *
 * Skip: SKIP_SEED_PURGE=1 npm run db:push
 */
import "dotenv/config";
import { inArray, like, or } from "drizzle-orm";
import { db, pool } from "../../server/db.ts";
import {
  QA_FIXTURE_CLASS_TYPE_PREFIX,
  QA_FIXTURE_INSTRUCTOR_EXACT,
  QA_FIXTURE_INSTRUCTOR_PREFIXES,
  QA_FIXTURE_QR_NAME_PREFIX,
  QA_FIXTURE_USER_EMAIL_DOMAIN,
  QA_FIXTURE_USER_EMAIL_PREFIXES,
  QA_SMOKE_CLASS_TYPE_PREFIX,
  QA_SMOKE_INSTRUCTOR_PREFIX,
  SEED_CLASS_TYPE_NAMES,
  SEED_INSTRUCTOR_NAMES,
} from "../../shared/seed-catalog.ts";
import {
  bookings,
  carouselPromotions,
  classTypeNotifyRequests,
  classTypes,
  classes,
  consentAuditLogs,
  instructors,
  paymentQrCodes,
  payments,
  sessionJoinEvents,
  sessionMoodCheckins,
  subscriptions,
  userSessionMappings,
  users,
} from "../../shared/schema.ts";

function fixtureClassTypeCondition() {
  const parts = [inArray(classTypes.name, [...SEED_CLASS_TYPE_NAMES])];
  parts.push(like(classTypes.name, `${QA_FIXTURE_CLASS_TYPE_PREFIX}%`));
  parts.push(like(classTypes.name, `${QA_SMOKE_CLASS_TYPE_PREFIX}%`));
  return or(...parts);
}

function fixtureInstructorCondition() {
  const parts: ReturnType<typeof inArray>[] = [
    inArray(instructors.name, [...SEED_INSTRUCTOR_NAMES, ...QA_FIXTURE_INSTRUCTOR_EXACT]),
  ];
  for (const prefix of QA_FIXTURE_INSTRUCTOR_PREFIXES) {
    parts.push(like(instructors.name, `${prefix}%`));
  }
  parts.push(like(instructors.name, `${QA_SMOKE_INSTRUCTOR_PREFIX}%`));
  return or(...parts);
}

function fixtureUserEmailCondition() {
  const parts = QA_FIXTURE_USER_EMAIL_PREFIXES.map((prefix) =>
    like(users.email, `${prefix}%${QA_FIXTURE_USER_EMAIL_DOMAIN}`),
  );
  return or(...parts);
}

async function deleteClassesAndDependents(classIds: string[]) {
  if (!classIds.length) return 0;

  const seedBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.classId, classIds));
  const bookingIds = seedBookings.map((r) => r.id);

  if (bookingIds.length) {
    await db.delete(consentAuditLogs).where(inArray(consentAuditLogs.bookingId, bookingIds));
    await db.delete(payments).where(inArray(payments.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
  }

  await db.delete(carouselPromotions).where(inArray(carouselPromotions.classId, classIds));
  await db.delete(sessionMoodCheckins).where(inArray(sessionMoodCheckins.classId, classIds));
  await db.delete(sessionJoinEvents).where(inArray(sessionJoinEvents.classId, classIds));
  await db.delete(userSessionMappings).where(inArray(userSessionMappings.classId, classIds));
  await db.delete(classes).where(inArray(classes.id, classIds));
  return classIds.length;
}

async function main() {
  const skip = process.env.SKIP_SEED_PURGE === "1" || process.env.SKIP_SEED_PURGE === "true";
  if (skip) {
    console.log("[purge-seed] SKIP_SEED_PURGE set — skipping QA fixture cleanup.");
    return;
  }

  const fixtureTypes = await db
    .select({ id: classTypes.id, name: classTypes.name })
    .from(classTypes)
    .where(fixtureClassTypeCondition());

  const fixtureInstructors = await db
    .select({ id: instructors.id, name: instructors.name })
    .from(instructors)
    .where(fixtureInstructorCondition());

  const fixtureTypeIds = fixtureTypes.map((r) => r.id);
  const fixtureInstructorIds = fixtureInstructors.map((r) => r.id);

  const classConditions = [];
  if (fixtureTypeIds.length) classConditions.push(inArray(classes.classTypeId, fixtureTypeIds));
  if (fixtureInstructorIds.length) {
    classConditions.push(inArray(classes.instructorId, fixtureInstructorIds));
  }

  const fixtureClasses =
    classConditions.length === 0
      ? []
      : await db
          .select({ id: classes.id })
          .from(classes)
          .where(or(...classConditions));

  const removedSessions = await deleteClassesAndDependents(fixtureClasses.map((r) => r.id));
  if (removedSessions) {
    console.log(`[purge-seed] Removed ${removedSessions} fixture session(s).`);
  }

  if (fixtureTypeIds.length) {
    await db.delete(subscriptions).where(inArray(subscriptions.classTypeId, fixtureTypeIds));
    await db
      .delete(classTypeNotifyRequests)
      .where(inArray(classTypeNotifyRequests.classTypeId, fixtureTypeIds));
    await db.delete(classTypes).where(inArray(classTypes.id, fixtureTypeIds));
    console.log(`[purge-seed] Removed ${fixtureTypeIds.length} fixture session type row(s).`);
  }

  if (fixtureInstructorIds.length) {
    await db.delete(instructors).where(inArray(instructors.id, fixtureInstructorIds));
    console.log(`[purge-seed] Removed ${fixtureInstructorIds.length} fixture instructor row(s).`);
  }

  const fixtureUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(fixtureUserEmailCondition());

  if (fixtureUsers.length) {
    const { storage } = await import("../../server/storage.ts");
    let removedUsers = 0;
    for (const user of fixtureUsers) {
      const result = await storage.deleteUserPermanently(user.id);
      if (result.ok) removedUsers += 1;
      else console.warn(`[purge-seed] Could not delete user ${user.email}: ${result.message}`);
    }
    console.log(`[purge-seed] Removed ${removedUsers} integration-test member account(s).`);
  }

  const fixtureQrs = await db
    .select({ id: paymentQrCodes.id, name: paymentQrCodes.name })
    .from(paymentQrCodes)
    .where(like(paymentQrCodes.name, `${QA_FIXTURE_QR_NAME_PREFIX}%`));

  if (fixtureQrs.length) {
    await db.delete(paymentQrCodes).where(inArray(paymentQrCodes.id, fixtureQrs.map((r) => r.id)));
    console.log(`[purge-seed] Removed ${fixtureQrs.length} test payment QR code(s).`);
  }

  const totalRemoved =
    fixtureTypeIds.length +
    fixtureInstructorIds.length +
    removedSessions +
    fixtureUsers.length +
    fixtureQrs.length;

  if (totalRemoved === 0) {
    console.log("[purge-seed] No demo or integration-test fixture rows found.");
  } else {
    console.log(
      "[purge-seed] QA cleanup complete. Admin-created data (e.g. Mudit Yoga, Deepti Kukreja) was kept.",
    );
  }
}

main()
  .catch((err) => {
    console.error("[purge-seed] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
