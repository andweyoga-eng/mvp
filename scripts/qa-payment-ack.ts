const base = "http://localhost:3000";
const classId = "a8936684-486b-4ba3-ac75-97c00deb4eb3";
const email = `qa.ack.${Date.now()}@example.com`;

async function main() {
  const bookRes = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId,
      guestName: "QA Ack Test",
      guestEmail: email,
    }),
  });
  const bookBody = await bookRes.json();
  console.log("booking status", bookRes.status, bookBody.booking?.id, !!bookBody.guestCheckoutToken);
  if (!bookRes.ok) {
    console.log(bookBody);
    process.exit(1);
  }

  const token = bookBody.guestCheckoutToken as string;
  const bookingId = bookBody.booking.id as string;

  const ackRes = await fetch(`${base}/api/bookings/${bookingId}/payment-ack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transactionAckNumber: "A1b2" }),
  });
  const ackBody = await ackRes.json();
  console.log("ack status", ackRes.status, ackBody);

  const dupRes = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId,
      guestName: "QA Ack Test",
      guestEmail: email,
    }),
  });
  const dupBody = await dupRes.json();
  console.log("duplicate status", dupRes.status, dupBody.code, dupBody.message?.slice(0, 120));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
