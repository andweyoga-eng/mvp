export const MAX_TEXT_LENGTH = {
  guestName: 80,
  guestEmail: 120,
  cancelReason: 300,
  deleteCompensation: 500,
  ownerOtp: 12,
} as const;

/** Placeholder owner OTP until live SMS verification ships. */
export const PLACEHOLDER_OWNER_CANCEL_OTP = "000000";

export function limitTextInput(value: string, max: number): string {
  return value.slice(0, Math.max(0, max));
}

export function normalizeOwnerCancelOtpInput(value: string): string {
  return value.replace(/\s+/g, "").replace(/\D/g, "");
}

export function isOwnerCancelFormSubmittable(reason: string, ownerOtp: string): boolean {
  return reason.trim().length >= 3 && normalizeOwnerCancelOtpInput(ownerOtp).length > 0;
}

export function ownerCancelFormBlocker(reason: string, ownerOtp: string): string | null {
  if (reason.trim().length < 3) {
    return "Enter a reason (at least 3 characters).";
  }
  if (normalizeOwnerCancelOtpInput(ownerOtp).length < 1) {
    return "Enter the owner OTP (use 000000 for now).";
  }
  return null;
}
