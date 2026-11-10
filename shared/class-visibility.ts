/** Fields required to decide if a session may appear in the public bookable catalog. */
export type ClassVisibilityFields = {
  status?: string | null;
  publishedAt?: string | Date | null;
  pausedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
};

/** Published (or scheduled and live) sessions members can book. */
export function isClassVisibleForBooking(
  cls: ClassVisibilityFields,
  now: Date = new Date(),
): boolean {
  if (cls.cancelledAt) return false;
  if (cls.pausedAt) return false;
  if (cls.status === "paused" || cls.status === "cancelled" || cls.status === "draft") {
    return false;
  }
  if (cls.status === "published") return true;
  if (
    cls.status === "scheduled" &&
    cls.publishedAt &&
    new Date(cls.publishedAt).getTime() <= now.getTime()
  ) {
    return true;
  }
  return false;
}
