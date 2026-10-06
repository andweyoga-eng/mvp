/**
 * One-off repair: enroll Shobha Rani in remaining Shashti+ series seats.
 * Sets subscription to 3 utilized / 33 remaining (total 36).
 * Marks Jul 9 + Jul 12 + Jul 14 (today's IST session) completed; Jul 16+ stay upcoming.
 *
 * Usage: npx tsx scripts/db/repair-shobha-shashti-enrollment.ts
 */
import "dotenv/config";
import { storage } from "../../server/storage";

const SHOBHA_USER_ID = "83576e91-4414-44cd-b663-3d06c746b7c3";
/** Jul 9 occurrence so the package includes 3 completed seats through today's session. */
const SHASHTI_ENROLL_FROM_CLASS_ID = "6d06a35c-76d7-413c-b363-566019f8b985";

async function main() {
  const result = await storage.enrollUserInPaidRecurringSeries({
    userId: SHOBHA_USER_ID,
    anchorClassId: SHASHTI_ENROLL_FROM_CLASS_ID,
    paymentStatus: "paid",
    // Keep original package size so remaining reads 33 with 3 utilized.
    totalSessionsOverride: 36,
    utilizedSessionsOverride: 3,
    // Jul 9, Jul 12, Jul 14 — leave Jul 16+ joinable.
    forceCompletedCount: 3,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        enrolled: result.enrolledClassIds.length,
        totalSessions: result.totalSessions,
        utilizedSessions: result.utilizedSessions,
        remaining: result.totalSessions - result.utilizedSessions,
      },
      null,
      2,
    ),
  );

  const sessions = await storage.getMemberSessions(SHOBHA_USER_ID);
  const shashti = sessions.filter((s) => s.className === "Shashti+");
  const summary = {
    upcoming: shashti.filter((s) => s.status === "upcoming").length,
    completed: shashti.filter((s) => s.status === "completed").length,
    cancelled: shashti.filter((s) => s.status === "cancelled").length,
  };
  console.log("Shashti+ member session statuses:", summary);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
