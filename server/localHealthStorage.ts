import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Response } from 'express';
import { userOwnsHealthDocumentPath } from './s3HealthStorage';

const ROOT = path.join(process.cwd(), 'data', 'health-documents');

function filePathForObjectPath(objectPath: string): string | null {
  const m = objectPath.match(/^\/objects\/health-documents\/([^/]+)\/([^/]+)$/);
  if (!m) return null;
  return path.join(ROOT, m[1], m[2]);
}

export async function saveLocalHealthDocument(
  userId: string,
  buffer: Buffer,
): Promise<string> {
  const id = randomUUID();
  const dir = path.join(ROOT, userId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, id), buffer);
  return `/objects/health-documents/${userId}/${id}`;
}

export async function streamLocalHealthDocument(
  objectPath: string,
  userId: string | undefined,
  res: Response,
): Promise<void> {
  if (!userOwnsHealthDocumentPath(objectPath, userId)) {
    res.status(401).json({ error: 'Unauthorized access to document' });
    return;
  }

  const filePath = filePathForObjectPath(objectPath);
  if (!filePath) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.png'
          ? 'image/png'
          : 'image/jpeg';

    res.set({
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=3600',
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ error: 'Document not found' });
  }
}
