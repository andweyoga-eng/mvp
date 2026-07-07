import { sendEmailDetailed } from "./email";

export interface CancellationRecipient {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  whatsappConsent: boolean;
}

export interface SessionCancellationNotice {
  kind: "session" | "session_type" | "session_deleted";
  reason: string;
  classTypeName: string;
  sessionLabel?: string;
  sessionDateIso?: string;
  instructorName?: string;
  compensation?: string;
}

export interface ChannelDeliveryResult {
  channel: "email" | "sms" | "whatsapp";
  recipientKey: string;
  status: "sent" | "skipped" | "placeholder" | "failed";
  detail: string;
}

export interface CancellationNotifySummary {
  recipientCount: number;
  results: ChannelDeliveryResult[];
}

function formatPhone(countryCode: string | null, phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const code = (countryCode ?? "+91").trim();
  return `${code}${digits}`;
}

function buildMessage(notice: SessionCancellationNotice): { subject: string; text: string; html: string } {
  const headline =
    notice.kind === "session_deleted"
      ? `Your ${notice.classTypeName} session has been removed`
      : notice.kind === "session_type"
        ? `${notice.classTypeName} is no longer offered`
        : `Your ${notice.classTypeName} session has been cancelled`;

  const when =
    notice.sessionLabel ??
    (notice.sessionDateIso
      ? new Date(notice.sessionDateIso).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        }) + " IST"
      : "the scheduled time");

  const bodyParts = [
    headline,
    "",
    notice.kind === "session_type"
      ? `All upcoming sessions for ${notice.classTypeName} have been cancelled.`
      : notice.kind === "session_deleted"
        ? `Session: ${when}${notice.instructorName ? ` with ${notice.instructorName}` : ""} has been permanently removed from our schedule.`
        : `Session: ${when}${notice.instructorName ? ` with ${notice.instructorName}` : ""}`,
    "",
    `Reason from the studio: ${notice.reason}`,
  ];

  if (notice.compensation?.trim()) {
    bodyParts.push("", `Compensation: ${notice.compensation.trim()}`);
  }

  bodyParts.push(
    "",
    notice.kind === "session_deleted"
      ? "We are sorry for the inconvenience. If you had a booking, our team will follow up on the compensation above."
      : "We are sorry for the inconvenience. If you had a booking, you do not need to take further action — your session will show as cancelled in your profile.",
    "",
    "— andWeYoga",
  );

  const body = bodyParts.join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:560px">
      <h2 style="color:#401e9c">${headline}</h2>
      <p>${
        notice.kind === "session_type"
          ? `All upcoming sessions for <strong>${notice.classTypeName}</strong> have been cancelled.`
          : notice.kind === "session_deleted"
            ? `Your session <strong>${when}</strong>${notice.instructorName ? ` with ${notice.instructorName}` : ""} has been permanently removed from our schedule.`
            : `Your session <strong>${when}</strong>${notice.instructorName ? ` with ${notice.instructorName}` : ""} has been cancelled.`
      }</p>
      <p style="background:#f5f0ff;border-left:4px solid #bb5309;padding:12px 16px;border-radius:8px">
        <strong>Reason:</strong> ${notice.reason}
      </p>
      ${
        notice.compensation?.trim()
          ? `<p style="background:#fff7ed;border-left:4px solid #bb5309;padding:12px 16px;border-radius:8px"><strong>Compensation:</strong> ${notice.compensation.trim()}</p>`
          : ""
      }
      <p style="color:#666;font-size:14px">${
        notice.kind === "session_deleted"
          ? "If you had a booking, our team will follow up on the compensation above."
          : "If you had a booking, it will appear as cancelled in your andWeYoga profile."
      }</p>
      <p style="margin-top:24px">— andWeYoga</p>
    </div>
  `;

  return { subject: headline, text: body, html };
}

/** Exported for unit tests (message copy only — no delivery). */
export function buildSessionCancellationMessage(notice: SessionCancellationNotice) {
  return buildMessage(notice);
}

/** Placeholder SMS/WhatsApp; sends real email when configured. */
export async function notifySessionCancellation(
  recipients: CancellationRecipient[],
  notice: SessionCancellationNotice,
): Promise<CancellationNotifySummary> {
  const unique = new Map<string, CancellationRecipient>();
  for (const r of recipients) {
    if (!unique.has(r.key)) unique.set(r.key, r);
  }

  const { subject, text, html } = buildMessage(notice);
  const results: ChannelDeliveryResult[] = [];

  for (const recipient of unique.values()) {
    const phone = formatPhone(recipient.phoneCountryCode, recipient.phone);

    if (recipient.email) {
      const emailResult = await sendEmailDetailed({
        to: recipient.email,
        subject,
        html,
      });
      results.push({
        channel: "email",
        recipientKey: recipient.key,
        status: emailResult.ok ? "sent" : "failed",
        detail: emailResult.ok ? emailResult.messageId : emailResult.error,
      });
    } else {
      results.push({
        channel: "email",
        recipientKey: recipient.key,
        status: "skipped",
        detail: "No email on file",
      });
    }

    if (phone) {
      console.log(
        `[SMS placeholder] → ${phone} | ${recipient.name}: ${text.replace(/\n/g, " ").slice(0, 160)}…`,
      );
      results.push({
        channel: "sms",
        recipientKey: recipient.key,
        status: "placeholder",
        detail: `Queued for SMS gateway (not live). Phone: ${phone}`,
      });

      if (recipient.whatsappConsent) {
        console.log(
          `[WhatsApp placeholder] → ${phone} | ${recipient.name}: ${text.replace(/\n/g, " ").slice(0, 160)}…`,
        );
        results.push({
          channel: "whatsapp",
          recipientKey: recipient.key,
          status: "placeholder",
          detail: `Queued for WhatsApp Business API (not live). Phone: ${phone}`,
        });
      } else {
        results.push({
          channel: "whatsapp",
          recipientKey: recipient.key,
          status: "skipped",
          detail: "Member has not opted in to WhatsApp contact",
        });
      }
    } else {
      results.push({
        channel: "sms",
        recipientKey: recipient.key,
        status: "skipped",
        detail: "No mobile number on file",
      });
      results.push({
        channel: "whatsapp",
        recipientKey: recipient.key,
        status: "skipped",
        detail: "No mobile number on file",
      });
    }
  }

  return { recipientCount: unique.size, results };
}

import { PLACEHOLDER_OWNER_CANCEL_OTP, normalizeOwnerCancelOtpInput } from "@shared/input-limits";

export function getOwnerCancelOtpPlaceholder(): string {
  const fromEnv = process.env.OWNER_CANCEL_OTP_DUMMY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : PLACEHOLDER_OWNER_CANCEL_OTP;
}

export function validateOwnerCancelOtp(ownerOtp: string): { ok: boolean; message?: string } {
  const normalized = normalizeOwnerCancelOtpInput(ownerOtp);
  if (!normalized) {
    return { ok: false, message: "Owner OTP is required." };
  }

  // Placeholder phase: accept any non-empty OTP until live SMS verification is enabled.
  const liveOtpEnabled = process.env.OWNER_CANCEL_OTP_LIVE === "true";
  if (!liveOtpEnabled) {
    return { ok: true };
  }

  const accepted = new Set([
    normalizeOwnerCancelOtpInput(getOwnerCancelOtpPlaceholder()),
    normalizeOwnerCancelOtpInput(PLACEHOLDER_OWNER_CANCEL_OTP),
  ]);

  if (accepted.has(normalized)) {
    return { ok: true };
  }

  return {
    ok: false,
    message: `Invalid owner OTP. Use ${getOwnerCancelOtpPlaceholder()} or contact the studio owner.`,
  };
}
