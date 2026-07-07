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
import { pool } from "../../server/db.ts";
import { purgeQaFixturesFromDb } from "./purge-qa-fixtures-core.ts";

async function main() {
  const skip = process.env.SKIP_SEED_PURGE === "1" || process.env.SKIP_SEED_PURGE === "true";
  if (skip) {
    console.log("[purge-seed] SKIP_SEED_PURGE set — skipping QA fixture cleanup.");
    return;
  }

  const summary = await purgeQaFixturesFromDb();

  if (summary.sessions) {
    console.log(`[purge-seed] Removed ${summary.sessions} fixture session(s).`);
  }
  if (summary.sessionTypes) {
    console.log(`[purge-seed] Removed ${summary.sessionTypes} fixture session type row(s).`);
  }
  if (summary.instructors) {
    console.log(`[purge-seed] Removed ${summary.instructors} fixture instructor row(s).`);
  }
  if (summary.users) {
    console.log(`[purge-seed] Removed ${summary.users} integration-test member account(s).`);
  }
  if (summary.paymentQrs) {
    console.log(`[purge-seed] Removed ${summary.paymentQrs} test payment QR code(s).`);
  }

  const totalRemoved =
    summary.sessionTypes +
    summary.instructors +
    summary.sessions +
    summary.users +
    summary.paymentQrs;

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
