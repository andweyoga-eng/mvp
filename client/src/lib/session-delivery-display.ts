export type DeliveryMode = "online" | "offline" | "hybrid" | string | null | undefined;

export interface SessionVenueFields {
  deliveryMode?: DeliveryMode;
  venueAddress?: string | null;
  venueMapLink?: string | null;
}

export function normalizeDeliveryMode(mode: DeliveryMode): "online" | "offline" | "hybrid" {
  if (mode === "offline" || mode === "hybrid") return mode;
  return "online";
}

export function deliveryModeLabel(mode: DeliveryMode): string {
  switch (normalizeDeliveryMode(mode)) {
    case "hybrid":
      return "Hybrid — Online";
    case "offline":
      return "In studio";
    default:
      return "Online (Google Meet)";
  }
}

export function hasPhysicalVenue(session: SessionVenueFields): boolean {
  const mode = normalizeDeliveryMode(session.deliveryMode);
  if (mode === "online") return false;
  return Boolean(session.venueAddress?.trim() || session.venueMapLink?.trim());
}

/** Best-effort embed URL — no Maps API key required. */
export function toMapEmbedUrl(
  venueMapLink: string | null | undefined,
  venueAddress: string | null | undefined,
): string | null {
  const link = venueMapLink?.trim();
  if (link) {
    if (link.includes("/maps/embed")) return link;
    try {
      const u = new URL(link);
      if (u.hostname.includes("google") && u.pathname.includes("/maps")) {
        const pb = u.searchParams.get("pb");
        if (pb) return `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`;
      }
    } catch {
      /* fall through */
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(link)}&output=embed`;
  }
  const addr = venueAddress?.trim();
  if (addr) {
    return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`;
  }
  return null;
}

export function externalMapUrl(
  venueMapLink: string | null | undefined,
  venueAddress: string | null | undefined,
): string | null {
  const link = venueMapLink?.trim();
  if (link) return link;
  const addr = venueAddress?.trim();
  if (addr) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  return null;
}

export function venueSummaryLine(session: SessionVenueFields): string | null {
  const addr = session.venueAddress?.trim();
  if (addr) return addr;
  if (session.venueMapLink?.trim()) return "View map for directions";
  return null;
}

export function formatSessionDeliverySummary(session: SessionVenueFields): string {
  const mode = normalizeDeliveryMode(session.deliveryMode);
  const venue = venueSummaryLine(session);

  if (mode === "online") {
    return deliveryModeLabel(mode);
  }
  if (mode === "hybrid") {
    return venue ? `Hybrid — Online · ${venue}` : deliveryModeLabel(mode);
  }
  return venue ?? deliveryModeLabel(mode);
}
