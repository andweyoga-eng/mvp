import { validateMobileNumber } from "@/lib/mobile-validation";

export function validateRequiredMobile(
  field: "primaryMobile" | "secondaryMobile" | "emergencyMobile",
  digits: string,
  countryCode: string,
): { isValid: boolean; error: string } {
  if (field === "secondaryMobile" && !digits.trim()) {
    return { isValid: true, error: "" };
  }
  if (field !== "secondaryMobile" && !digits.trim()) {
    return {
      isValid: false,
      error:
        field === "primaryMobile"
          ? "Mobile number is required"
          : "Emergency contact is required",
    };
  }
  const v = validateMobileNumber(digits, countryCode);
  return { isValid: v.isValid, error: v.error ?? "" };
}
