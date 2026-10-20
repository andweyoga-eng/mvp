import "dotenv/config";
/**
 * @deprecated Legacy ad-hoc QA script with hardcoded session IDs and no cleanup.
 * Prefer: npm run qa:smoke-a01-e01 (creates tagged fixtures, asserts, auto-cleans).
 * If you must run this, cancel or delete any bookings it creates afterward.
 */
import { generateGuestCheckoutToken } from "../server/auth";
import { storage } from "../server/storage";

const base = "http://localhost:3000";
const qrClassId = "a8936684-486b-4ba3-ac75-97c00deb4eb3";
const rzClassId = "33f1774a-a4aa-4a95-b1f9-2bde7f42027d";

async function guestBook(email: string, classId: string) {
  const res = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classId, guestName: "QA Guest", guestEmail: email }),
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  const email = `qa.full.${Date.now()}@example.com`;

  console.log("=== Bug 2: duplicate processing (QR) ===");
  const first = await guestBook(email, qrClassId);
  console.log("first booking", first.status, first.body.booking?.id);
  const dup = await guestBook(email, qrClassId);
  console.log("duplicate", dup.status, dup.body.code);
  console.log("message snippet:", String(dup.body.message).slice(0, 100));

  console.log("\n=== Bug 2: duplicate confirmed ===");
  const email2 = `qa.confirmed.${Date.now()}@example.com`;
  const b2 = await guestBook(email2, qrClassId);
  const bookingId = b2.body.booking.id as string;
  await storage.updateBookingPaymentStatus(bookingId, "paid");
  const dupConfirmed = await guestBook(email2, qrClassId);
  console.log("confirmed dup", dupConfirmed.status, dupConfirmed.body.code);

  console.log("\n=== Bug 3: sync-status (paid recovery) ===");
  const email3 = `qa.sync.${Date.now()}@example.com`;
  const b3 = await guestBook(email3, rzClassId);
  const booking3 = b3.body.booking.id as string;
  const token3 = b3.body.guestCheckoutToken as string;
  const payment = await storage.getPaymentByBookingId(booking3);
  if (payment) {
    await storage.updatePayment(payment.id, { status: "paid", adminDisposition: "approved" });
    await storage.updateBookingPaymentStatus(booking3, "paid");
  }
  const syncRes = await fetch(`${base}/api/payments/${payment?.id}/sync-status`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token3}`, "Content-Type": "application/json" },
  });
  const syncBody = await syncRes.json();
  console.log("sync-status", syncRes.status, syncBody.success, syncBody.isGuestCheckout);
}

main().catch(console.error);
