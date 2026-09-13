import { sendEmail, isEmailConfigured } from "./email";
import { sendTransactionalSms } from "./msg91";
import {
  COUPON_CREATE_DUMMY_OTP,
  couponUsageInstructions,
  formatCouponDiscountLabel,
  normalizeCouponCode,
  type CouponShareChannel,
} from "@shared/coupons";
import type { Class, ClassType, CouponCode, User } from "@shared/schema";

export function verifyCouponCreateOtp(otp: string): boolean {
  const normalized = otp.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  return normalized === COUPON_CREATE_DUMMY_OTP;
}

export function couponCreateOtpHint(): string {
  return "Dummy OTP for coupon creation. In production this will be emailed by the finance controller.";
}

export function buildCouponShareEmailHtml(params: {
  memberName: string;
  code: string;
  discountLabel: string;
  sessionLabel: string;
  expiresAt: Date | string;
  instructions: string;
}): string {
  const deadline = new Date(params.expiresAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Your andWeYoga coupon</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(64,30,156,0.12);">
        <div style="background:linear-gradient(135deg,#401e9c,#e36b16);padding:28px 20px;color:#fff;text-align:center;">
          <h1 style="margin:0;font-size:22px;">Your session offer</h1>
        </div>
        <div style="padding:28px;">
          <p style="color:#333;">Hi ${params.memberName},</p>
          <p style="color:#333;line-height:1.6;">You have a special offer for <strong>${params.sessionLabel}</strong>.</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#401e9c;text-align:center;margin:24px 0;">${params.code}</p>
          <p style="text-align:center;color:#e36b16;font-weight:bold;">${params.discountLabel}</p>
          <p style="color:#333;line-height:1.6;"><strong>How to use:</strong> Book your session on andweyoga.com, proceed to checkout, and enter this code in the coupon field before paying.</p>
          <p style="color:#333;line-height:1.6;"><strong>Applicable session:</strong> ${params.sessionLabel}</p>
          <p style="color:#b45309;line-height:1.6;"><strong>Expires:</strong> ${deadline}. The code stops working at this exact moment.</p>
          <p style="color:#666;font-size:13px;">${params.instructions}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildCouponShareSmsText(params: {
  code: string;
  discountLabel: string;
  sessionLabel: string;
  expiresAt: Date | string;
}): string {
  const deadline = new Date(params.expiresAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `andWeYoga offer ${params.code}: ${params.discountLabel} on ${params.sessionLabel}. Apply at checkout before ${deadline}. Expires exactly then.`;
}

export async function deliverCouponShare(
  channel: CouponShareChannel,
  user: User,
  coupon: CouponCode,
  sessionLabel: string,
): Promise<{ ok: boolean; error?: string }> {
  const code = normalizeCouponCode(coupon.code);
  const discountLabel = formatCouponDiscountLabel(
    coupon.discountType as "fixed" | "percent",
    coupon.discountValue,
  );
  const instructions = couponUsageInstructions(code, coupon.expiresAt);

  if (channel === "email") {
    if (!isEmailConfigured()) {
      return { ok: false, error: "Email is not configured" };
    }
    try {
      await sendEmail({
        to: user.email,
        subject: `Your andWeYoga coupon: ${code}`,
        html: buildCouponShareEmailHtml({
          memberName: user.name,
          code,
          discountLabel,
          sessionLabel,
          expiresAt: coupon.expiresAt,
          instructions,
        }),
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Email send failed" };
    }
  }

  if (channel === "sms") {
    const phone = user.primaryMobile?.replace(/\D/g, "").slice(-10);
    if (!phone || phone.length !== 10) {
      return { ok: false, error: "Member has no valid mobile for SMS" };
    }
    const sent = await sendTransactionalSms(
      phone,
      buildCouponShareSmsText({ code, discountLabel, sessionLabel, expiresAt: coupon.expiresAt }),
    );
    return sent ? { ok: true } : { ok: false, error: "SMS gateway unavailable or delivery failed" };
  }

  // WhatsApp — placeholder until gateway is integrated (same pattern as session cancellation)
  if (!user.whatsappConsent) {
    return { ok: false, error: "Member has not consented to WhatsApp contact" };
  }
  const waPhone = user.primaryMobile?.replace(/\D/g, "").slice(-10);
  if (!waPhone || waPhone.length !== 10) {
    return { ok: false, error: "Member has no valid mobile for WhatsApp" };
  }
  console.log(
    `[coupon-share] WhatsApp placeholder → +91${waPhone}: ${buildCouponShareSmsText({
      code,
      discountLabel,
      sessionLabel,
      expiresAt: coupon.expiresAt,
    })}`,
  );
  return { ok: true };
}

export function resolveCouponSessionLabel(
  coupon: CouponCode,
  classType?: ClassType | null,
  cls?: Class | null,
): string {
  if (cls && classType) {
    const when = new Date(cls.date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${classType.name} on ${when}`;
  }
  if (classType) return classType.name;
  return "Any eligible session";
}
