export const MAX_TEXT_LENGTH = {
  guestName: 80,
  guestEmail: 120,
  cancelReason: 300,
  ownerOtp: 12,
} as const;

export function limitTextInput(value: string, max: number): string {
  return value.slice(0, Math.max(0, max));
}
