import "dotenv/config";
import { storage } from "../server/storage";
import { generateGuestCheckoutToken } from "../server/auth";

async function main() {
  const bookingId = process.argv[2] || "2976b7e1-4146-4846-83aa-698a87810aed";
  const token = generateGuestCheckoutToken(bookingId);
  console.log("token ok", !!token);

  const booking = await storage.getBooking(bookingId);
  console.log("booking", booking?.id, booking?.isGuestCheckout, booking?.paymentMethod);

  try {
    const updated = await storage.submitBookingPaymentAck(
      bookingId,
      null,
      bookingId,
      "A1b2",
    );
    console.log("updated", updated?.verificationStatus, updated?.transactionAckNumber);
  } catch (e) {
    console.error("submit error", e);
  }
}

main();
