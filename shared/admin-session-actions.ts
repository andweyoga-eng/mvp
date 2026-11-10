/** Whether an admin week-grid session is paused (hidden from public booking). */
import {
  normalizeOwnerCancelOtpInput,
} from "./input-limits";

export function isAdminSessionPaused(session: {
  status?: string | null;
  pausedAt?: string | Date | null;
}): boolean {
  return session.status === "paused" || Boolean(session.pausedAt);
}

export function isSessionDeleteFormSubmittable(
  reason: string,
  ownerOtp: string,
  bookingCount: number,
  compensation: string,
): boolean {
  if (reason.trim().length < 3) return false;
  if (normalizeOwnerCancelOtpInput(ownerOtp).length < 1) return false;
  if (bookingCount > 0 && compensation.trim().length < 3) return false;
  return true;
}

export function sessionDeleteFormBlocker(
  reason: string,
  ownerOtp: string,
  bookingCount: number,
  compensation: string,
): string | null {
  if (reason.trim().length < 3) {
    return "Enter a reason (at least 3 characters).";
  }
  if (bookingCount > 0 && compensation.trim().length < 3) {
    return "Enter compensation details for booked members (at least 3 characters).";
  }
  if (normalizeOwnerCancelOtpInput(ownerOtp).length < 1) {
    return "Enter the owner OTP (use 000000 for now).";
  }
  return null;
}
