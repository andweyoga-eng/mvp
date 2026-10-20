import { fetchMyConsentStatus } from "@/lib/consent-api";
import { clearPendingBooking } from "@/lib/pending-booking";
import { waitlistPhoneMatchesProfile } from "@shared/waitlist";

const PENDING_KEY = "awy_pending_waitlist_v1";
const WELCOME_KEY = "awy_waitlist_welcome_v1";
const PHONE_CHOICE_KEY = "awy_waitlist_phone_choice_v1";

export interface PendingWaitlist {
  classTypeId: string;
  className: string;
  whatsapp: string;
}

export interface WaitlistPhoneChoice {
  classTypeId: string;
  className: string;
  whatsapp: string;
  profileMobile: string;
  alreadyConsented: boolean;
}

export type WaitlistWelcome =
  | { kind: "welcome"; className: string }
  | { kind: "joined"; className: string }
  | { kind: "already"; className: string; joinedAt: string };

export function setPendingWaitlist(intent: PendingWaitlist): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(intent));
  } catch {
    /* ignore */
  }
}

export function getPendingWaitlist(): PendingWaitlist | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingWaitlist;
    if (!parsed.classTypeId || !parsed.whatsapp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingWaitlist(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function setWaitlistWelcome(welcome: WaitlistWelcome): void {
  try {
    sessionStorage.setItem(WELCOME_KEY, JSON.stringify(welcome));
  } catch {
    /* ignore */
  }
}

export function consumeWaitlistWelcome(): WaitlistWelcome | null {
  try {
    const raw = sessionStorage.getItem(WELCOME_KEY);
    sessionStorage.removeItem(WELCOME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WaitlistWelcome> & { className?: string };
    if (!parsed.className) return null;
    if (parsed.kind === "already" && "joinedAt" in parsed && parsed.joinedAt) {
      return { kind: "already", className: parsed.className, joinedAt: parsed.joinedAt };
    }
    if (parsed.kind === "joined") return { kind: "joined", className: parsed.className };
    return { kind: "welcome", className: parsed.className };
  } catch {
    return null;
  }
}

/** Date and time the original waitlist place was saved, in India time. */
export function formatWaitlistJoinedLabel(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return `${day} at ${time}`;
}

export function setWaitlistPhoneChoice(choice: WaitlistPhoneChoice): void {
  try {
    sessionStorage.setItem(PHONE_CHOICE_KEY, JSON.stringify(choice));
  } catch {
    /* ignore */
  }
}

export function getWaitlistPhoneChoice(): WaitlistPhoneChoice | null {
  try {
    const raw = sessionStorage.getItem(PHONE_CHOICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WaitlistPhoneChoice;
    if (!parsed.classTypeId || !parsed.whatsapp || !parsed.profileMobile) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWaitlistPhoneChoice(): void {
  try {
    sessionStorage.removeItem(PHONE_CHOICE_KEY);
  } catch {
    /* ignore */
  }
}

async function saveWaitlistAndWelcome(input: {
  classTypeId: string;
  className: string;
  whatsapp: string;
  alreadyConsented: boolean;
}): Promise<boolean> {
  const res = await fetch(`/api/class-types/${encodeURIComponent(input.classTypeId)}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ whatsapp: input.whatsapp }),
  });
  if (!res.ok) return false;
  const data = (await res.json().catch(() => null)) as {
    alreadyListed?: boolean;
    createdAt?: string;
  } | null;
  if (!input.alreadyConsented) {
    setWaitlistWelcome({ kind: "welcome", className: input.className });
    return true;
  }
  if (data?.alreadyListed && data.createdAt) {
    setWaitlistWelcome({
      kind: "already",
      className: input.className,
      joinedAt: data.createdAt,
    });
    return true;
  }
  setWaitlistWelcome({ kind: "joined", className: input.className });
  return true;
}

/** Join the class saved before Gmail sign-in. Keeps the original place if they are already listed. */
export async function joinPendingWaitlistIfNeeded(user: {
  primaryMobile?: string | null;
} | null): Promise<void> {
  const pending = getPendingWaitlist();
  if (!pending) return;
  clearPendingWaitlist();
  clearPendingBooking();

  let alreadyConsented = false;
  try {
    const consent = await fetchMyConsentStatus();
    alreadyConsented = consent.requirement?.requiresConsent === false;
  } catch {
    alreadyConsented = false;
  }

  if (!waitlistPhoneMatchesProfile(pending.whatsapp, user?.primaryMobile)) {
    setWaitlistPhoneChoice({
      classTypeId: pending.classTypeId,
      className: pending.className,
      whatsapp: pending.whatsapp,
      profileMobile: user?.primaryMobile?.trim() || pending.whatsapp,
      alreadyConsented,
    });
    return;
  }

  try {
    await saveWaitlistAndWelcome({ ...pending, alreadyConsented });
  } catch {
    /* welcome stays off; they can join again from the card */
  }
}

/** Save the waitlist after the member chooses where a different number applies. */
export async function completeWaitlistPhoneChoice(choice: WaitlistPhoneChoice): Promise<boolean> {
  try {
    return await saveWaitlistAndWelcome(choice);
  } catch {
    return false;
  }
}
