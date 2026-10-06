import type { ConsentType } from "./consent";
import type { User } from "./schema";

export type MaintenanceChannel = "email" | "sms" | "whatsapp";

export type ConsentChecker = (userId: string, consentType: ConsentType) => Promise<boolean>;

/** Member-facing maintenance copy (overlay + notifications). */
export const MAINTENANCE_OVERLAY_HEADLINE = "We're on a short savasana";
export const MAINTENANCE_OVERLAY_BODY =
  "The studio's getting a little tune-up. We'll be back on the mat shortly. Breathe easy.";
export const MAINTENANCE_EMAIL_SUBJECT = "andWeYoga: quick pause, back soon";
export const MAINTENANCE_SMS_TEXT =
  "andWeYoga: We're doing a quick studio tune-up. We'll be back on the mat shortly. Namaste.";

export function buildMaintenanceEmailHtml(memberName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>${MAINTENANCE_EMAIL_SUBJECT}</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(64,30,156,0.12);">
        <div style="background:linear-gradient(135deg,#401e9c,#e36b16);padding:28px 20px;color:#fff;text-align:center;">
          <h1 style="margin:0;font-size:22px;">${MAINTENANCE_OVERLAY_HEADLINE}</h1>
        </div>
        <div style="padding:28px;">
          <p style="color:#333;">Hi ${memberName},</p>
          <p style="color:#333;line-height:1.6;">${MAINTENANCE_OVERLAY_BODY}</p>
          <p style="color:#666;font-size:14px;margin-top:24px;">andWeYoga</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Channels a member may receive maintenance notices on.
 * SMS is omitted until a dedicated sms_contact consent exists.
 */
export async function resolveMaintenanceChannels(
  user: Pick<User, "id" | "isActive" | "email" | "whatsappConsent" | "primaryMobile">,
  hasConsent: ConsentChecker,
): Promise<MaintenanceChannel[]> {
  if (!user.isActive) return [];

  const channels: MaintenanceChannel[] = [];

  if (user.email?.trim() && (await hasConsent(user.id, "profile_booking"))) {
    channels.push("email");
  }

  if (
    user.whatsappConsent &&
    user.primaryMobile?.trim() &&
    (await hasConsent(user.id, "whatsapp_contact"))
  ) {
    channels.push("whatsapp");
  }

  return channels;
}
