import crypto from "crypto";
import bcrypt from "bcryptjs";
import { isEmailConfigured, sendEmailDetailed } from "./email";
import type { Instructor } from "@shared/schema";

const OTP_TTL_MS = 10 * 60 * 1000;

export async function createInstructorOtpPayload(): Promise<{
  otp: string;
  hash: string;
  expiresAt: Date;
  linkToken: string;
}> {
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = await bcrypt.hash(otp, 10);
  const linkToken = crypto.randomBytes(32).toString("hex");
  return { otp, hash, expiresAt: new Date(Date.now() + OTP_TTL_MS), linkToken };
}

export async function verifyInstructorOtpHash(
  otp: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
}

export function buildInstructorVerifyEmailUrl(linkToken: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/api/instructors/verify-email?token=${encodeURIComponent(linkToken)}`;
}

export function resolvePublicAppBaseUrl(hostHeader?: string | null): string {
  const host = process.env.ALLOWED_ORIGIN?.trim() || hostHeader?.trim() || "localhost:3000";
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const protocol =
    process.env.NODE_ENV !== "production" && isLocalHost ? "http" : "https";
  return `${protocol}://${host}`;
}

export function createInstructorOtpEmailHTML(params: {
  name: string;
  otp: string;
  verifyUrl?: string;
}): string {
  const linkBlock = params.verifyUrl
    ? `<p style="margin:20px 0;text-align:center;">
         <a href="${params.verifyUrl}" style="display:inline-block;background:#401e9c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
           Verify email
         </a>
       </p>
       <p style="color:#666;font-size:13px;text-align:center;">Or use the code above if the button does not open.</p>`
    : "";

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
          <p style="color:#333;line-height:1.6;">Use this one-time code or link to verify your email for andWeYoga instructor onboarding. It expires in 10 minutes.</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#401e9c;text-align:center;margin:24px 0;">${params.otp}</p>
          ${linkBlock}
          <p style="color:#6b46c1;font-size:14px;">If you did not request this, contact mudit@andweyoga.com.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createInstructorEmailVerifiedHTML(name: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Email verified — andWeYoga</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:40px 20px;text-align:center;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 8px 24px rgba(64,30,156,0.12);">
        <h1 style="color:#401e9c;margin:0 0 12px;font-size:22px;">Email verified</h1>
        <p style="color:#333;line-height:1.6;">Hi ${name}, your email is verified for andWeYoga instructor onboarding. You can close this page.</p>
      </div>
    </body>
    </html>
  `;
}

export async function deliverInstructorEmailOtp(
  instructor: Instructor,
  otp: string,
  options?: { verifyUrl?: string },
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
    html: createInstructorOtpEmailHTML({
      name: instructor.name,
      otp,
      verifyUrl: options?.verifyUrl,
    }),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
