type SessionFrequency = "drop_in" | "trial" | "recurring" | string | null | undefined;
type DeliveryMode = "online" | "offline" | "hybrid" | string | null | undefined;

export function getSessionBadgeLabel(
  sessionFrequency: SessionFrequency,
  deliveryMode: DeliveryMode,
): string | null {
  if (sessionFrequency === "recurring") {
    return "Regular batch";
  }

  if (sessionFrequency === "trial") {
    if (deliveryMode === "offline") return "Offline Trial session";
    return "Online Trial session";
  }

  if (sessionFrequency === "drop_in") {
    if (deliveryMode === "offline") return "Offline Drop In";
    return "Online Drop In";
  }

  return null;
}
