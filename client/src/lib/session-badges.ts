type SessionFrequency = "drop_in" | "trial" | "recurring" | string | null | undefined;
type DeliveryMode = "online" | "offline" | "hybrid" | string | null | undefined;

/** Informational badge style so session labels don't compete with booking CTAs. */
export const SESSION_INFO_BADGE_CLASSNAME =
  "pointer-events-none select-none border-primary/15 bg-primary/5 font-medium text-primary/80 shadow-none";

export function getSessionBadgeLabel(
  sessionFrequency: SessionFrequency,
  deliveryMode: DeliveryMode,
): string | null {
  if (sessionFrequency === "recurring") {
    return "Regular batch";
  }

  if (sessionFrequency === "trial") {
    if (deliveryMode === "offline") return "Offline trial";
    return "Online trial";
  }

  if (sessionFrequency === "drop_in") {
    if (deliveryMode === "offline") return "Offline drop-in";
    return "Online drop-in";
  }

  return null;
}
