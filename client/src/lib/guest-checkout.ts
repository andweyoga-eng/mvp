import { getAuthHeaders } from "@/lib/auth";
import {
  GUEST_CHECKOUT_TOKEN_STORAGE_KEY,
} from "@shared/guest-checkout";

export function getGuestCheckoutToken(): string | null {
  return sessionStorage.getItem(GUEST_CHECKOUT_TOKEN_STORAGE_KEY);
}

export function setGuestCheckoutToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(GUEST_CHECKOUT_TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(GUEST_CHECKOUT_TOKEN_STORAGE_KEY);
  }
}

export function getCheckoutAuthHeaders(options?: {
  /** When true, guest checkout token wins over a stale member Bearer token. */
  preferGuest?: boolean;
}): Record<string, string> {
  const guestToken = getGuestCheckoutToken();
  const memberHeaders = getAuthHeaders();

  if (options?.preferGuest && guestToken) {
    return { Authorization: `Bearer ${guestToken}` };
  }

  if (memberHeaders.Authorization) return memberHeaders;
  if (guestToken) return { Authorization: `Bearer ${guestToken}` };
  return {};
}

export function clearGuestCheckoutSession(): void {
  sessionStorage.removeItem(GUEST_CHECKOUT_TOKEN_STORAGE_KEY);
}
