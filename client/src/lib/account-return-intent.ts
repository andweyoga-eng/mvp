/**
 * Remembers where a member came from when My Account interrupts them for
 * Health History + health-data consent (WeDiet, weEmo, etc.).
 * Paid booking still uses pending-booking → Reserve; this is for tab intents.
 */

const STORAGE_KEY = "awy_account_return_intent_v1";

const ALLOWED_RETURN_PATHS = new Set(["/fuel", "/emojou"]);

export function setAccountReturnIntent(path: string): void {
  try {
    const normalized = path.split("?")[0]?.split("#")[0] ?? "";
    if (!ALLOWED_RETURN_PATHS.has(normalized)) return;
    sessionStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function peekAccountReturnIntent(): string | null {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY);
    if (path && ALLOWED_RETURN_PATHS.has(path)) return path;
    return null;
  } catch {
    return null;
  }
}

/** Read and clear so a completed setup only redirects once. */
export function consumeAccountReturnIntent(): string | null {
  const path = peekAccountReturnIntent();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return path;
}

export function clearAccountReturnIntent(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
