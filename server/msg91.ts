/**
 * MSG91 SMS — sends when MSG91_AUTH_KEY and MSG91_SENDER_ID are configured.
 * Returns false when SMS is not configured or delivery fails.
 */
export async function sendTransactionalSms(
  phone10Digits: string,
  message: string,
): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim();
  if (!authKey || !senderId) {
    return false;
  }

  const mobile = phone10Digits.replace(/\D/g, "").slice(-10);
  if (mobile.length !== 10) return false;

  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: authKey,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID?.trim() || undefined,
        short_url: "0",
        recipients: [{ mobiles: `91${mobile}`, message }],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[MSG91] SMS send failed:", err);
    return false;
  }
}
