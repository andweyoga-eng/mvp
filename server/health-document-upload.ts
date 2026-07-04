import { z } from 'zod';
import type { Response } from 'express';
import {
  HEALTH_DOCUMENT_MAX_BYTES,
  HEALTH_DOCUMENT_TOO_LARGE_MESSAGE,
} from '@shared/health-disclosure';
import {
  isAllowedHealthDocumentMeta,
  isHealthDocumentWithinSizeLimit,
} from '@shared/health-document-validation';
import { getHealthObjectStorageBackend } from './objectStorage';
import {
  deleteS3HealthDocument,
  putHealthDocumentBuffer,
  streamS3HealthDocument,
  userOwnsHealthDocumentPath,
} from './s3HealthStorage';
import {
  deleteLocalHealthDocument,
  saveLocalHealthDocument,
  streamLocalHealthDocument,
} from './localHealthStorage';

export type HealthDocumentUploadBackend = 's3' | 'replit' | 'local';

export function resolveHealthDocumentUploadBackend(): HealthDocumentUploadBackend | null {
  if (process.env.ENABLE_HEALTH_DOCUMENT_OBJECT_ROUTES === 'false') {
    return null;
  }

  try {
    return getHealthObjectStorageBackend();
  } catch {
    if (process.env.NODE_ENV === 'development') {
      return 'local';
    }
    return null;
  }
}

export function isHealthDocumentUploadEnabled(): boolean {
  return resolveHealthDocumentUploadBackend() !== null;
}

export const healthDocumentUploadBodySchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileBase64: z.string().min(1),
});

export async function uploadHealthDocumentForUser(
  userId: string,
  input: z.infer<typeof healthDocumentUploadBodySchema>,
): Promise<{ objectPath: string }> {
  const backend = resolveHealthDocumentUploadBackend();
  if (!backend) {
    throw new Error('Health document uploads are not configured on this server.');
  }

  if (!isAllowedHealthDocumentMeta(input.fileName, input.contentType)) {
    throw new HealthDocumentUploadError(
      'Unsupported file type. Please upload a PDF, JPG, or PNG file.',
      400,
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.fileBase64, 'base64');
  } catch {
    throw new HealthDocumentUploadError('Invalid file payload.', 400);
  }

  if (!isHealthDocumentWithinSizeLimit(buffer.length)) {
    throw new HealthDocumentUploadError(HEALTH_DOCUMENT_TOO_LARGE_MESSAGE, 413);
  }

  if (buffer.length > HEALTH_DOCUMENT_MAX_BYTES) {
    throw new HealthDocumentUploadError(HEALTH_DOCUMENT_TOO_LARGE_MESSAGE, 413);
  }

  if (backend === 'local') {
    const objectPath = await saveLocalHealthDocument(userId, buffer);
    return { objectPath };
  }

  if (backend === 's3') {
    const { objectPath } = await putHealthDocumentBuffer(
      userId,
      buffer,
      input.contentType,
    );
    return { objectPath };
  }

  throw new HealthDocumentUploadError(
    'Direct uploads are not supported for this storage backend yet. Please email your document to mudit@andweyoga.com.',
    503,
  );
}

export async function streamHealthDocumentForUser(
  objectPath: string,
  userId: string | undefined,
  res: Response,
): Promise<void> {
  const backend = resolveHealthDocumentUploadBackend();

  if (backend === 'local') {
    await streamLocalHealthDocument(objectPath, userId, res);
    return;
  }

  if (backend === 's3') {
    if (!userOwnsHealthDocumentPath(objectPath, userId)) {
      res.status(401).json({ error: 'Unauthorized access to document' });
      return;
    }
    try {
      await streamS3HealthDocument(objectPath, res);
    } catch (error) {
      console.error('S3 document stream error:', error);
      if (!res.headersSent) {
        res.status(404).json({ error: 'Document not found' });
      }
    }
    return;
  }

  const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
  const objectStorageService = new ObjectStorageService();
  try {
    await objectStorageService.serveObjectEntity(objectPath, userId, res);
  } catch (error) {
    console.error('Error accessing document:', error);
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function deleteHealthDocumentObject(pathOrKey: string): Promise<boolean> {
  const backend = resolveHealthDocumentUploadBackend();

  if (backend === 'local') {
    return deleteLocalHealthDocument(pathOrKey);
  }

  if (backend === 's3') {
    return deleteS3HealthDocument(pathOrKey);
  }

  const { ObjectStorageService } = await import('./objectStorage');
  const objectStorageService = new ObjectStorageService();
  return objectStorageService.deleteObjectEntity(pathOrKey);
}

export class HealthDocumentUploadError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
