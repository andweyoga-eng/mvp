/** Strip to digits only, max 10 (Indian mobile without country code). */
export function sanitizeGuestPhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

const REQUIRED_PHONE_MESSAGE =
  "A valid 10-digit mobile number is required to complete your booking.";

/** Required guest checkout phone — exactly 10 digits. */
export function validateRequiredGuestPhone(
  phone: string,
): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = sanitizeGuestPhoneInput(phone);
  if (!normalized || normalized.length !== 10) {
    return { ok: false, message: REQUIRED_PHONE_MESSAGE };
  }
  return { ok: true, normalized };
}

/** @deprecated Use validateRequiredGuestPhone for guest checkout. */
export function validateOptionalGuestPhone(
  phone: string,
): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = sanitizeGuestPhoneInput(phone);
  if (!normalized) {
    return { ok: false, message: REQUIRED_PHONE_MESSAGE };
  }
  if (normalized.length !== 10) {
    return { ok: false, message: REQUIRED_PHONE_MESSAGE };
  }
  return { ok: true, normalized };
}

export { REQUIRED_PHONE_MESSAGE };
