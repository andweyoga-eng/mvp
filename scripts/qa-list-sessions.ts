import { storage } from "../server/storage";

async function main() {
  const classes = await storage.getPublishedClasses();
  const upcoming = classes.filter((c) => new Date(c.date) > new Date());
  for (const c of upcoming) {
    console.log(c.id, c.paymentMethod, String(c.date).slice(0, 19), c.sessionFrequency);
  }
  console.log("---");
  const qr = upcoming.filter((c) => String(c.paymentMethod || "").includes("qr"));
  const rz = upcoming.filter((c) => String(c.paymentMethod || "").includes("razorpay"));
  console.log("QR sessions:", qr.length, qr.map((c) => c.id));
  console.log("Razorpay sessions:", rz.length, rz.map((c) => c.id));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
