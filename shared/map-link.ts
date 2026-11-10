const HTTPS_URL = /^https:\/\/.+/i;
const SRC_ATTR = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const FIRST_HTTPS = /https:\/\/[^\s"'<>]+/i;

function decodeMapUrl(value: string): string {
  return value.replace(/&amp;/gi, "&").trim();
}

/**
 * Map link values are stored as a single https URL.
 * A pasted Google embed snippet is reduced to the address in src.
 */
export function extractHttpsUrl(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (HTTPS_URL.test(trimmed) && !/\s/.test(trimmed)) return trimmed;

  const src = trimmed.match(SRC_ATTR);
  const fromSrc = decodeMapUrl(src?.[1] ?? src?.[2] ?? src?.[3] ?? "");
  if (HTTPS_URL.test(fromSrc) && !/\s/.test(fromSrc)) return fromSrc;

  const any = trimmed.match(FIRST_HTTPS);
  const fromText = decodeMapUrl(any?.[0] ?? "");
  if (HTTPS_URL.test(fromText) && !/\s/.test(fromText)) return fromText;
  return null;
}
