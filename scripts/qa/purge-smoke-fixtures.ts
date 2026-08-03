/**
 * Remove ephemeral rows tagged with QA_SMOKE_* prefixes (see shared/seed-catalog.ts).
 * Used by smoke scripts (finally) and `npm run qa:smoke-cleanup`.
 */
import "dotenv/config";
import { inArray, like, or } from "drizzle-orm";
import { db, pool } from "../../server/db.ts";
import {
  QA_SMOKE_CLASS_TYPE_PREFIX,
  QA_SMOKE_INSTRUCTOR_PREFIX,
} from "../../shared/seed-catalog.ts";
import {
  bookings,
  carouselPromotions,
  classTypeNotifyRequests,
  classTypes,
  classes,
  consentAuditLogs,
  instructors,
  payments,
  sessionJoinEvents,
  sessionMoodCheckins,
  subscriptions,
  userSessionMappings,
  programs,
} from "../../shared/schema.ts";

async function deleteClassesAndDependents(classIds: string[]) {
  if (!classIds.length) return 0;

  const seedBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.classId, classIds));
  const bookingIds = seedBookings.map((r) => r.id);

  if (bookingIds.length) {
    await db
      .update(payments)
      .set({
        bookingId: null,
        classId: null,
        updatedAt: new Date(),
      })
      .where(inArray(payments.bookingId, bookingIds));
    await db
      .update(consentAuditLogs)
      .set({ bookingId: null })
      .where(inArray(consentAuditLogs.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
  }

  await db
    .update(payments)
    .set({ classId: null, updatedAt: new Date() })
    .where(inArray(payments.classId, classIds));

  await db.delete(carouselPromotions).where(inArray(carouselPromotions.classId, classIds));
  await db.delete(sessionMoodCheckins).where(inArray(sessionMoodCheckins.classId, classIds));
  await db.delete(sessionJoinEvents).where(inArray(sessionJoinEvents.classId, classIds));
  await db.delete(userSessionMappings).where(inArray(userSessionMappings.classId, classIds));
  await db.delete(classes).where(inArray(classes.id, classIds));
  return classIds.length;
}

export async function purgeSmokeFixtures(): Promise<void> {
  const fixtureTypes = await db
    .select({ id: classTypes.id })
    .from(classTypes)
    .where(like(classTypes.name, `${QA_SMOKE_CLASS_TYPE_PREFIX}%`));

  const fixtureInstructors = await db
    .select({ id: instructors.id })
    .from(instructors)
    .where(like(instructors.name, `${QA_SMOKE_INSTRUCTOR_PREFIX}%`));

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
    console.log(`[qa:smoke-cleanup] Removed ${removedSessions} smoke session(s).`);
  }

  if (fixtureTypeIds.length) {
    await db
      .update(subscriptions)
      .set({ programId: null, updatedAt: new Date() })
      .where(inArray(subscriptions.classTypeId, fixtureTypeIds));
    await db.delete(programs).where(inArray(programs.classTypeId, fixtureTypeIds));
    await db.delete(subscriptions).where(inArray(subscriptions.classTypeId, fixtureTypeIds));
    await db
      .delete(classTypeNotifyRequests)
      .where(inArray(classTypeNotifyRequests.classTypeId, fixtureTypeIds));
    await db.delete(classTypes).where(inArray(classTypes.id, fixtureTypeIds));
    console.log(`[qa:smoke-cleanup] Removed ${fixtureTypeIds.length} smoke session type(s).`);
  }

  if (fixtureInstructorIds.length) {
    await db.delete(instructors).where(inArray(instructors.id, fixtureInstructorIds));
    console.log(`[qa:smoke-cleanup] Removed ${fixtureInstructorIds.length} smoke instructor(s).`);
  }

  if (!removedSessions && !fixtureTypeIds.length && !fixtureInstructorIds.length) {
    console.log("[qa:smoke-cleanup] No smoke fixtures found — slate already clean.");
  }
}

async function main() {
  await purgeSmokeFixtures();
  await pool.end();
}

const isDirectRun = process.argv[1]?.endsWith("purge-smoke-fixtures.ts");
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
