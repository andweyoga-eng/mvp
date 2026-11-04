import { z } from "zod";
import { validateRequiredGuestPhone } from "./guest-phone";

export function validateGuestName(name: string): string | null {
  if (!name.trim()) return "Name is required";
  return null;
}

export function validateGuestEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!z.string().email().safeParse(trimmed).success) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validateGuestPhoneField(phone: string): string | null {
  const check = validateRequiredGuestPhone(phone);
  return check.ok ? null : check.message;
}

export type GuestFieldKey = "name" | "email" | "phone";

export function validateGuestField(field: GuestFieldKey, value: string): string | null {
  if (field === "name") return validateGuestName(value);
  if (field === "email") return validateGuestEmail(value);
  return validateGuestPhoneField(value);
}

export function validateGuestForm(values: {
  name: string;
  email: string;
  phone: string;
}): Record<GuestFieldKey, string> {
  return {
    name: validateGuestName(values.name) ?? "",
    email: validateGuestEmail(values.email) ?? "",
    phone: validateGuestPhoneField(values.phone) ?? "",
  };
}

export function guestFormHasErrors(errors: Record<GuestFieldKey, string>): boolean {
  return Object.values(errors).some(Boolean);
}

export function firstGuestFormError(errors: Record<GuestFieldKey, string>): string | null {
  for (const key of ["name", "email", "phone"] as const) {
    if (errors[key]) return errors[key];
  }
  return null;
}
