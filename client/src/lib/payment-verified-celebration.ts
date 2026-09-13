const PAYMENT_CONFIRMED_ACK_KEY = "awy_payment_confirmed_ack_v1";
const JOIN_PROMPT_ACK_KEY = "awy_join_prompt_ack_v1";

function loadAckSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveAckSet(key: string, set: Set<string>): void {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function acknowledgePaymentConfirmed(bookingId: string): void {
  const set = loadAckSet(PAYMENT_CONFIRMED_ACK_KEY);
  set.add(bookingId);
  saveAckSet(PAYMENT_CONFIRMED_ACK_KEY, set);
}

export function isPaymentConfirmedAcknowledged(bookingId: string): boolean {
  return loadAckSet(PAYMENT_CONFIRMED_ACK_KEY).has(bookingId);
}

export function acknowledgeJoinPrompt(bookingId: string): void {
  const set = loadAckSet(JOIN_PROMPT_ACK_KEY);
  set.add(bookingId);
  saveAckSet(JOIN_PROMPT_ACK_KEY, set);
}

export function isJoinPromptAcknowledged(bookingId: string): boolean {
  return loadAckSet(JOIN_PROMPT_ACK_KEY).has(bookingId);
}
