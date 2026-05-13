/** Allowed MIME types for health documents (PDF + images only). */
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/pjpeg",
  "image/x-png",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXT = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "tif",
  "tiff",
  "bmp",
  "heic",
  "heif",
]);

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
};

export function getHealthDocumentFileExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

/**
 * PDF or image only. Allows extension-based detection when `file.type` is empty
 * or `application/octet-stream` (common for drag-drop or some mobile cameras).
 */
export function isAllowedHealthDocument(file: File): boolean {
  const ext = getHealthDocumentFileExtension(file.name);

  if (ALLOWED_MIMES.has(file.type)) {
    return true;
  }

  if (!ALLOWED_EXT.has(ext)) {
    return false;
  }

  if (!file.type || file.type === "application/octet-stream") {
    return true;
  }

  if (ext === "pdf") {
    return file.type === "application/pdf";
  }

  return file.type.startsWith("image/");
}

/** Presigned PUTs need a non-empty Content-Type for many object stores. */
export function healthDocumentContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const ext = getHealthDocumentFileExtension(file.name);
  return EXT_TO_MIME[ext] || "application/octet-stream";
}
