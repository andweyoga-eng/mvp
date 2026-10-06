import "dotenv/config";
import { generateGuestCheckoutToken, verifyGuestCheckoutToken } from "../server/auth";
import { canAccessBooking } from "../server/booking-access";
import { storage } from "../server/storage";
import { memberPaymentAckSchema } from "../shared/schema";
import { normalizeSessionPaymentMethod } from "../shared/payment-gateway";

async function main() {
  const bookingId = process.argv[2]!;
  const token = generateGuestCheckoutToken(bookingId);
  const guestDecoded = verifyGuestCheckoutToken(token);
  console.log("guestDecoded", guestDecoded);

  const req = {
    user: undefined,
    guestCheckoutBookingId: guestDecoded?.bookingId,
  } as import("../server/auth").AuthRequest;

  const body = memberPaymentAckSchema.parse({ transactionAckNumber: "C3d4" });
  console.log("parsed", body);

  const booking = await storage.getBooking(bookingId);
  console.log("canAccess", booking && canAccessBooking(req, booking));

  const payMethod = normalizeSessionPaymentMethod(booking!.paymentMethod);
  console.log("payMethod", payMethod);

  const updated = await storage.submitBookingPaymentAck(
    booking!.id,
    req.user?.id ?? null,
    req.guestCheckoutBookingId ?? null,
    body.transactionAckNumber,
  );
  console.log("updated", !!updated);
}

main().catch((e) => console.error("FAIL", e));
