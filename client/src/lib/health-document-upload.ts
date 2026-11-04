import { getAuthHeaders } from '@/lib/auth';
import { healthDocumentContentType } from '@/lib/health-document-helpers';
import { HEALTH_DOCUMENT_TOO_LARGE_MESSAGE } from '@shared/health-disclosure';

export type HealthDocumentUploadResult =
  | { ok: true; objectPath: string }
  | { ok: false; status: number; message: string; tooLarge?: boolean };

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadHealthDocumentFile(file: File): Promise<HealthDocumentUploadResult> {
  const fileBase64 = await readFileAsBase64(file);

  const response = await fetch('/api/health-documents/upload', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: healthDocumentContentType(file),
      fileBase64,
    }),
  });

  const data = await response.json().catch(() => ({} as { error?: string; objectPath?: string }));

  if (!response.ok) {
    const message = data.error || 'Failed to upload document';
    return {
      ok: false,
      status: response.status,
      message,
      tooLarge: response.status === 413 || message === HEALTH_DOCUMENT_TOO_LARGE_MESSAGE,
    };
  }

  if (!data.objectPath) {
    return { ok: false, status: 500, message: 'Upload succeeded but no document path was returned.' };
  }

  return { ok: true, objectPath: data.objectPath };
}
