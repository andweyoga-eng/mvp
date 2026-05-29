/** Persists booking intent across login (e.g. Google OAuth full-page redirect). */

export type BookingScrollTarget = "schedule" | "teach";

export interface BookingIntent {
  /** Scheduled session id (from Week Schedule → Book). */
  sessionId?: string;
  /** Class type id (from and We Teach → Book Now). */
  classTypeId?: string;
  /** Where to scroll when reopening after login. */
  scrollTo?: BookingScrollTarget;
}

const STORAGE_KEY = "awy_pending_booking_v2";
const LEGACY_KEY = "awy_pending_booking_class_id";

export function setPendingBooking(intent: BookingIntent): void {
  try {
    if (!intent.sessionId && !intent.classTypeId && !intent.scrollTo) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
    if (intent.sessionId) {
      sessionStorage.setItem(LEGACY_KEY, intent.sessionId);
    }
  } catch {
    /* ignore */
  }
}

export function getPendingBooking(): BookingIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BookingIntent;
      if (parsed.sessionId || parsed.classTypeId || parsed.scrollTo) return parsed;
    }
    const legacySessionId = sessionStorage.getItem(LEGACY_KEY);
    if (legacySessionId) {
      return { sessionId: legacySessionId, scrollTo: "schedule" };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingBooking(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated Use setPendingBooking */
export function setPendingBookingClassId(classId: string): void {
  setPendingBooking({ sessionId: classId, scrollTo: "schedule" });
}

/** @deprecated Use getPendingBooking */
export function getPendingBookingClassId(): string | null {
  return getPendingBooking()?.sessionId ?? null;
}

/** @deprecated Use clearPendingBooking */
export function clearPendingBookingClassId(): void {
  clearPendingBooking();
}
