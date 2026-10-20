/** Strip to digits and cap at 10 for Indian mobile inputs in admin forms. */
export function clampIndianPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidIndianPhone(digits: string): boolean {
  return /^\d{10}$/.test(digits);
}
