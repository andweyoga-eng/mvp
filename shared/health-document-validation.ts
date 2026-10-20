import { HEALTH_DOCUMENT_MAX_BYTES } from './health-disclosure';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export function getHealthDocumentExtension(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

export function isAllowedHealthDocumentMeta(
  fileName: string,
  contentType: string,
): boolean {
  const ext = getHealthDocumentExtension(fileName);
  if (ALLOWED_MIMES.has(contentType)) return true;
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!contentType || contentType === 'application/octet-stream') return true;
  if (ext === 'pdf') return contentType === 'application/pdf';
  return contentType.startsWith('image/');
}

export function isHealthDocumentWithinSizeLimit(byteLength: number): boolean {
  return byteLength > 0 && byteLength <= HEALTH_DOCUMENT_MAX_BYTES;
}
