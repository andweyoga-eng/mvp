import {
  buildMaintenanceEmailHtml,
  MAINTENANCE_EMAIL_SUBJECT,
  MAINTENANCE_SMS_TEXT,
  resolveMaintenanceChannels,
} from "@shared/maintenance-notify";
import { sendEmailDetailed } from "./email";
import { storage } from "./storage";

export interface MaintenanceChannelDeliveryResult {
  channel: "email" | "sms" | "whatsapp";
  recipientKey: string;
  status: "sent" | "skipped" | "placeholder" | "failed";
  detail: string;
}

export interface MaintenanceNotifySummary {
  recipientCount: number;
  results: MaintenanceChannelDeliveryResult[];
}

function formatPhone(countryCode: string | null | undefined, phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const code = (countryCode ?? "+91").trim();
  return `${code}${digits}`;
}

/** Notify active members on consented channels when maintenance window is enabled. */
export async function notifyMaintenanceWindowEnabled(): Promise<MaintenanceNotifySummary> {
  if (process.env.NODE_ENV !== "production") {
    return { recipientCount: 0, results: [] };
  }

  const users = (await storage.getAllUsers()).filter((u) => u.isActive);
  const results: MaintenanceChannelDeliveryResult[] = [];

  for (const user of users) {
    const channels = await resolveMaintenanceChannels(user, (id, type) =>
      storage.userHasActiveConsent(id, type),
    );

    if (channels.length === 0) {
      results.push({
        channel: "email",
        recipientKey: user.id,
        status: "skipped",
        detail: "No consented channels for this member",
      });
      continue;
    }

    const phone = formatPhone(user.primaryMobileCountryCode, user.primaryMobile);

    for (const channel of channels) {
      if (channel === "email") {
        const emailResult = await sendEmailDetailed({
          to: user.email,
          subject: MAINTENANCE_EMAIL_SUBJECT,
          html: buildMaintenanceEmailHtml(user.name),
        });
        results.push({
          channel: "email",
          recipientKey: user.id,
          status: emailResult.ok ? "sent" : "failed",
          detail: emailResult.ok ? emailResult.messageId : emailResult.error,
        });
        continue;
      }

      if (channel === "whatsapp") {
        if (!phone) {
          results.push({
            channel: "whatsapp",
            recipientKey: user.id,
            status: "skipped",
            detail: "No mobile number on file",
          });
          continue;
        }
        console.log(
          `[maintenance-notify] WhatsApp placeholder → ${phone} | ${user.name}: ${MAINTENANCE_SMS_TEXT}`,
        );
        results.push({
          channel: "whatsapp",
          recipientKey: user.id,
          status: "placeholder",
          detail: `Queued for WhatsApp Business API (not live). Phone: ${phone}`,
        });
      }
    }

    // SMS has no consent type yet — always skipped for audit visibility.
    results.push({
      channel: "sms",
      recipientKey: user.id,
      status: "skipped",
      detail: "No SMS consent on file",
    });
  }

  return { recipientCount: users.length, results };
}
