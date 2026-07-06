import { z } from "zod";

export const HEALTH_MEDIA_TYPES = ["document", "video", "audio"] as const;
export type HealthMediaType = (typeof HEALTH_MEDIA_TYPES)[number];

export type HealthMediaLink = {
  id: string;
  type: HealthMediaType;
  url: string;
  label?: string;
  addedAt: string;
};

const ALLOWED_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "sheets.google.com",
  "slides.google.com",
]);

export const HEALTH_MEDIA_LINK_HELP = {
  headline: "Have a doctor's note, scan, or video to share? We'd love to see it — safely.",
  body: "Upload to your Google Drive, set sharing to Anyone with the link can view, then paste the link below. We never download or store your files — only the link so your team can review before class.",
  trust: "Stored as a link only · never uploaded to our servers",
  steps: [
    "Upload your file to Google Drive (or create a Google Doc).",
    'Click Share → set to "Anyone with the link" → Viewer.',
    "Copy the link and paste it in the matching field below.",
  ],
} as const;

export const HEALTH_MEDIA_TYPE_LABELS: Record<HealthMediaType, string> = {
  document: "Document",
  video: "Video",
  audio: "Audio",
};

export const healthMediaLinkSchema = z.object({
  id: z.string().min(1),
  type: z.enum(HEALTH_MEDIA_TYPES),
  url: z.string().min(1),
  label: z.string().trim().max(120).optional(),
  addedAt: z.string().min(1),
});

export function isAllowedHealthMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return ALLOWED_HOSTS.has(host);
}

export function normalizeHealthMediaUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "https:") return null;
    if (!isAllowedHealthMediaHost(parsed.hostname)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateHealthMediaUrl(
  raw: string,
  expectedType?: HealthMediaType,
): { valid: true; url: string } | { valid: false; message: string } {
  const normalized = normalizeHealthMediaUrl(raw);
  if (!normalized) {
    return {
      valid: false,
      message: "Please paste a valid Google Drive or Google Docs link (https://).",
    };
  }

  if (expectedType === "document" && !isDocumentLikeUrl(normalized)) {
    return {
      valid: false,
      message: "Please use a Google Doc, Sheet, Slide, or Drive document link.",
    };
  }

  if ((expectedType === "video" || expectedType === "audio") && !isDriveFileUrl(normalized)) {
    return {
      valid: false,
      message: "Please use a Google Drive file link for video or audio.",
    };
  }

  return { valid: true, url: normalized };
}

function isDriveFileUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.includes("drive.google.com")) return false;
    return /\/file\/d\/[^/]+/.test(pathname) || pathname.includes("/open");
  } catch {
    return false;
  }
}

function isDocumentLikeUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname.includes("docs.google.com")) return true;
    if (hostname.includes("sheets.google.com")) return true;
    if (hostname.includes("slides.google.com")) return true;
    if (hostname.includes("drive.google.com")) {
      return /\/file\/d\/[^/]+/.test(pathname) || pathname.includes("/open");
    }
    return false;
  } catch {
    return false;
  }
}

/** Google embed / preview URL for read-only admin viewing (no server fetch). */
export function healthMediaPreviewUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "docs.google.com" && parsed.pathname.includes("/document/")) {
      const id = extractIdFromPath(parsed.pathname, "/document/d/");
      return id ? `https://docs.google.com/document/d/${id}/preview` : null;
    }
    if (host === "sheets.google.com" && parsed.pathname.includes("/spreadsheets/")) {
      const id = extractIdFromPath(parsed.pathname, "/spreadsheets/d/");
      return id ? `https://docs.google.com/spreadsheets/d/${id}/preview` : null;
    }
    if (host === "slides.google.com" && parsed.pathname.includes("/presentation/")) {
      const id = extractIdFromPath(parsed.pathname, "/presentation/d/");
      return id ? `https://docs.google.com/presentation/d/${id}/embed` : null;
    }
    if (host === "drive.google.com") {
      const fileId = extractDriveFileId(url);
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function extractIdFromPath(pathname: string, prefix: string): string | null {
  const idx = pathname.indexOf(prefix);
  if (idx < 0) return null;
  const rest = pathname.slice(idx + prefix.length);
  const id = rest.split("/")[0];
  return id || null;
}

export function extractDriveFileId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return match[1];
    const openId = parsed.searchParams.get("id");
    return openId || null;
  } catch {
    return null;
  }
}

export function parseHealthMediaLinks(raw: unknown): HealthMediaLink[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is HealthMediaLink =>
      !!item &&
      typeof item === "object" &&
      typeof (item as HealthMediaLink).id === "string" &&
      typeof (item as HealthMediaLink).url === "string" &&
      HEALTH_MEDIA_TYPES.includes((item as HealthMediaLink).type),
  );
}

export function isHealthObjectDocumentPath(url: string): boolean {
  return /^\/objects\/health-documents\/[^/]+\/[^/]+$/.test(url.trim());
}

export function filterHealthObjectDocumentUrls(urls: string[] | null | undefined): string[] {
  return (urls ?? []).filter(isHealthObjectDocumentPath);
}

/** Google Drive / Docs links only — excludes uploaded object-storage paths. */
export function resolveHealthMediaLinks(
  mediaLinks: unknown,
  legacyDocumentUrls: string[] | null | undefined,
): HealthMediaLink[] {
  const parsed = parseHealthMediaLinks(mediaLinks);
  if (parsed.length > 0) return parsed;

  const legacy = (legacyDocumentUrls ?? []).filter((url) => !isHealthObjectDocumentPath(url));
  const now = new Date().toISOString();
  const migrated: HealthMediaLink[] = [];
  legacy.forEach((url, index) => {
    const normalized = normalizeHealthMediaUrl(url);
    if (!normalized) return;
    migrated.push({
      id: `legacy-${index}`,
      type: "document",
      url: normalized,
      addedAt: now,
    });
  });
  return migrated;
}

export function hasHealthMediaLinks(
  mediaLinks: unknown,
  legacyDocumentUrls?: string[] | null,
): boolean {
  return resolveHealthMediaLinks(mediaLinks, legacyDocumentUrls).length > 0;
}

/** True when the member shared Google links and/or a direct upload. */
export function hasHealthSupportingMaterials(
  mediaLinks: unknown,
  documentUrls?: string[] | null,
): boolean {
  return (
    hasHealthMediaLinks(mediaLinks, documentUrls) ||
    filterHealthObjectDocumentUrls(documentUrls).length > 0
  );
}

export function sanitizeHealthMediaLinksForSave(
  links: HealthMediaLink[],
): HealthMediaLink[] {
  const seen = new Set<string>();
  const result: HealthMediaLink[] = [];

  for (const link of links) {
    const validation = validateHealthMediaUrl(link.url, link.type);
    if (!validation.valid) continue;
    const key = `${link.type}:${validation.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: link.id || cryptoRandomId(),
      type: link.type,
      url: validation.url,
      ...(link.label?.trim() ? { label: link.label.trim() } : {}),
      addedAt: link.addedAt || new Date().toISOString(),
    });
  }

  return result;
}

function cryptoRandomId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyHealthMediaDraft(): Record<HealthMediaType, string> {
  return { document: "", video: "", audio: "" };
}

export function draftToHealthMediaLinks(
  draft: Record<HealthMediaType, string>,
  labels?: Partial<Record<HealthMediaType, string>>,
): HealthMediaLink[] {
  const now = new Date().toISOString();
  const links: HealthMediaLink[] = [];

  for (const type of HEALTH_MEDIA_TYPES) {
    const raw = draft[type].trim();
    if (!raw) continue;
    const validation = validateHealthMediaUrl(raw, type);
    if (!validation.valid) continue;
    links.push({
      id: cryptoRandomId(),
      type,
      url: validation.url,
      ...(labels?.[type]?.trim() ? { label: labels[type]!.trim() } : {}),
      addedAt: now,
    });
  }

  return links;
}

export function healthMediaLinksToDraft(
  links: HealthMediaLink[],
): Record<HealthMediaType, string> {
  const draft = createEmptyHealthMediaDraft();
  for (const link of links) {
    if (!draft[link.type]) {
      draft[link.type] = link.url;
    }
  }
  return draft;
}
