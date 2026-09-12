import { inArray, like, or } from "drizzle-orm";
import { db } from "../../server/db.ts";
import { assertPurgeAllowed } from "../../shared/purge-safety.ts";
import {
  QA_AGENT_CLASS_TYPE_PREFIX,
  QA_AGENT_INSTRUCTOR_PREFIX,
  QA_FIXTURE_CLASS_TYPE_PREFIX,
  QA_FIXTURE_INSTRUCTOR_EXACT,
  QA_FIXTURE_INSTRUCTOR_PREFIXES,
  QA_FIXTURE_QR_NAME_PREFIX,
  QA_FIXTURE_USER_EMAIL_DOMAIN,
  QA_FIXTURE_USER_EMAIL_PREFIXES,
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
  paymentQrCodes,
  payments,
  programs,
  sessionJoinEvents,
  sessionMoodCheckins,
  subscriptions,
  userSessionMappings,
  users,
} from "../../shared/schema.ts";

export type PurgeQaFixturesSummary = {
  sessionTypes: number;
  instructors: number;
  sessions: number;
  users: number;
  paymentQrs: number;
};

function fixtureClassTypeCondition() {
  // Safer end state (D10): never match live catalogue names (e.g. Hatha Yoga).
  // Only QA / smoke / agent prefixes.
  return or(
    like(classTypes.name, `${QA_FIXTURE_CLASS_TYPE_PREFIX}%`),
    like(classTypes.name, `${QA_SMOKE_CLASS_TYPE_PREFIX}%`),
    like(classTypes.name, `${QA_AGENT_CLASS_TYPE_PREFIX}%`),
  );
}

function fixtureInstructorCondition() {
  const parts: Array<ReturnType<typeof like> | ReturnType<typeof inArray>> = [
    inArray(instructors.name, [...QA_FIXTURE_INSTRUCTOR_EXACT]),
  ];
  for (const prefix of QA_FIXTURE_INSTRUCTOR_PREFIXES) {
    parts.push(like(instructors.name, `${prefix}%`));
  }
  parts.push(like(instructors.name, `${QA_SMOKE_INSTRUCTOR_PREFIX}%`));
  parts.push(like(instructors.name, `${QA_AGENT_INSTRUCTOR_PREFIX}%`));
  return or(...parts);
}

function fixtureUserEmailCondition() {
  const parts = QA_FIXTURE_USER_EMAIL_PREFIXES.map((prefix) =>
    like(users.email, `${prefix}%${QA_FIXTURE_USER_EMAIL_DOMAIN}`),
  );
  return or(...parts);
}

/**
 * Detach financial + consent rows (D4 pattern), then remove bookings/class.
 * Never hard-delete payments or consent audit logs.
 */
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

/** Remove demo seed + integration-test fixture rows. Safe to call from tests (does not close the pool). */
export async function purgeQaFixturesFromDb(): Promise<PurgeQaFixturesSummary> {
  assertPurgeAllowed(process.env as import("../../shared/purge-safety.ts").PurgeEnv);

  const summary: PurgeQaFixturesSummary = {
    sessionTypes: 0,
    instructors: 0,
    sessions: 0,
    users: 0,
    paymentQrs: 0,
  };

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

  summary.sessions = await deleteClassesAndDependents(fixtureClasses.map((r) => r.id));

  if (fixtureTypeIds.length) {
    // Detach program FKs on subscriptions before removing programs / types.
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
    summary.sessionTypes = fixtureTypeIds.length;
  }

  if (fixtureInstructorIds.length) {
    await db.delete(instructors).where(inArray(instructors.id, fixtureInstructorIds));
    summary.instructors = fixtureInstructorIds.length;
  }

  const fixtureUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(fixtureUserEmailCondition());

  if (fixtureUsers.length) {
    const { storage } = await import("../../server/storage.ts");
    for (const user of fixtureUsers) {
      const result = await storage.deleteUserPermanently(user.id);
      if (result.ok) summary.users += 1;
    }
  }

  const fixtureQrs = await db
    .select({ id: paymentQrCodes.id })
    .from(paymentQrCodes)
    .where(like(paymentQrCodes.name, `${QA_FIXTURE_QR_NAME_PREFIX}%`));

  if (fixtureQrs.length) {
    await db.delete(paymentQrCodes).where(inArray(paymentQrCodes.id, fixtureQrs.map((r) => r.id)));
    summary.paymentQrs = fixtureQrs.length;
  }

  return summary;
}
