/** Strip to digits only, max 10 (Indian mobile without country code). */
export function sanitizeGuestPhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Optional guest checkout phone — empty is allowed; otherwise exactly 10 digits. */
export function validateOptionalGuestPhone(
  phone: string,
): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = sanitizeGuestPhoneInput(phone);
  if (!normalized) return { ok: true, normalized: "" };
  if (normalized.length !== 10) {
    return {
      ok: false,
      message: "Enter a valid 10-digit mobile number, or leave it blank.",
    };
  }
  return { ok: true, normalized };
}
