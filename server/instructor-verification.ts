import crypto from "crypto";
import bcrypt from "bcryptjs";
import { isEmailConfigured, sendEmailDetailed } from "./email";
import type { Instructor } from "@shared/schema";

const OTP_TTL_MS = 10 * 60 * 1000;

export async function createInstructorOtpPayload(): Promise<{
  otp: string;
  hash: string;
  expiresAt: Date;
}> {
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = await bcrypt.hash(otp, 10);
  return { otp, hash, expiresAt: new Date(Date.now() + OTP_TTL_MS) };
}

export async function verifyInstructorOtpHash(
  otp: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
}

export function createInstructorOtpEmailHTML(params: {
  name: string;
  otp: string;
}): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Verify your email — andWeYoga</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(64,30,156,0.12);">
        <div style="background:linear-gradient(135deg,#401e9c,#e36b16);padding:28px 20px;color:#fff;text-align:center;">
          <h1 style="margin:0;font-size:22px;">Instructor email verification</h1>
        </div>
        <div style="padding:28px;">
          <p style="color:#333;">Hi ${params.name},</p>
          <p style="color:#333;line-height:1.6;">Use this one-time code to verify your email for andWeYoga instructor onboarding. It expires in 10 minutes.</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#401e9c;text-align:center;margin:24px 0;">${params.otp}</p>
          <p style="color:#6b46c1;font-size:14px;">If you did not request this, contact mudit@andweyoga.com.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function deliverInstructorEmailOtp(
  instructor: Instructor,
  otp: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!instructor.email?.trim()) {
    return { ok: false, error: "Instructor has no email address on file." };
  }
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error:
        "Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env (use a Google App Password).",
    };
  }
  const result = await sendEmailDetailed({
    to: instructor.email.trim(),
    subject: "Your andWeYoga instructor verification code",
    html: createInstructorOtpEmailHTML({ name: instructor.name, otp }),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
