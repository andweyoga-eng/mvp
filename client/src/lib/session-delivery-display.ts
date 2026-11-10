import { extractHttpsUrl } from "@shared/map-link";

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
      return "Hybrid (Online)";
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

function isMapEmbedUrl(link: string): boolean {
  return link.includes("/maps/embed");
}

/** Inline map only when the saved link is a Google embed URL. */
export function toMapEmbedUrl(
  venueMapLink: string | null | undefined,
  _venueAddress?: string | null | undefined,
): string | null {
  const link = extractHttpsUrl(venueMapLink);
  if (link && isMapEmbedUrl(link)) return link;
  return null;
}

/** New-window link. An embed URL is not a page, so the studio address is used instead. */
export function externalMapUrl(
  venueMapLink: string | null | undefined,
  venueAddress: string | null | undefined,
): string | null {
  const link = extractHttpsUrl(venueMapLink);
  if (link && !isMapEmbedUrl(link)) return link;
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
    return venue ? `Hybrid (Online) · ${venue}` : deliveryModeLabel(mode);
  }
  return venue ?? deliveryModeLabel(mode);
}
