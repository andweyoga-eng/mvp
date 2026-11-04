import { isClassVisibleForBooking, type ClassVisibilityFields } from "@shared/class-visibility";
import { isSessionWindowOpen, resolveSessionDurationMinutes } from "@shared/session-window";

type UpcomingClass = ClassVisibilityFields & {
  classTypeId: string;
  date?: string | Date | null;
  duration?: number | null;
  classType?: { duration?: number | null } | null;
};

/**
 * Class types that still have a session a member can book.
 * A published session that has already ended does not count.
 */
export function collectBookableClassTypeIds(
  upcomingClasses: UpcomingClass[],
  availabilityIds: string[] | undefined,
  now: Date = new Date(),
): Set<string> {
  const ids = new Set<string>();
  for (const cls of upcomingClasses) {
    if (!cls.date || !isClassVisibleForBooking(cls, now)) continue;
    const duration = resolveSessionDurationMinutes(cls.classType?.duration ?? cls.duration);
    if (!isSessionWindowOpen(cls.date, duration, now)) continue;
    ids.add(cls.classTypeId);
  }
  for (const id of availabilityIds ?? []) ids.add(id);
  return ids;
}
