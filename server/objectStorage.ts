import type { Response } from "express";
import { ObjectAclPolicy } from "./objectAcl";
import {
  assertS3Configured,
  deleteS3HealthDocument,
  presignHealthDocumentPut,
  s3UploadUrlToObjectPath,
  streamS3HealthDocument,
  userOwnsHealthDocumentPath,
  verifyS3HealthObjectExists,
} from "./s3HealthStorage";

export type HealthObjectStorageBackend = "s3";

let cachedBackend: HealthObjectStorageBackend | null = null;

/** S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, etc.) */
export function getHealthObjectStorageBackend(): HealthObjectStorageBackend {
  const explicit = (process.env.OBJECT_STORAGE || "").trim().toLowerCase();
  if (explicit === "s3") {
    assertS3Configured();
    return "s3";
  }

  const hasS3 =
    !!(process.env.S3_BUCKET || process.env.AWS_S3_BUCKET) &&
    !!process.env.AWS_ACCESS_KEY_ID?.trim() &&
    !!process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (hasS3) {
    assertS3Configured();
    return "s3";
  }

  throw new Error(
    "Object storage is not configured. Set OBJECT_STORAGE=s3, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION; for Cloudflare R2 add S3_ENDPOINT and S3_FORCE_PATH_STYLE=true."
  );
}

function backend(): HealthObjectStorageBackend {
  if (!cachedBackend) {
    cachedBackend = getHealthObjectStorageBackend();
  }
  return cachedBackend;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  async getObjectEntityUploadURL(userId?: string): Promise<string> {
    backend();
    if (!userId) {
      throw new Error("Authenticated user id is required for document uploads.");
    }
    const { uploadUrl } = await presignHealthDocumentPut(userId);
    return uploadUrl;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("https://") || rawPath.startsWith("http://")) {
      return s3UploadUrlToObjectPath(rawPath);
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalized = this.normalizeObjectEntityPath(rawPath);
    if (!normalized.startsWith("/objects/health-documents/")) {
      throw new Error("Invalid health document path");
    }
    if (!userOwnsHealthDocumentPath(normalized, aclPolicy.owner)) {
      throw new Error("Upload does not belong to the signed-in user");
    }
    const key = normalized.replace(/^\/objects\//, "");
    await verifyS3HealthObjectExists(key);
    return normalized;
  }

  async deleteObjectEntity(reqPath: string): Promise<boolean> {
    await deleteS3HealthDocument(reqPath);
    return true;
  }

  /** Download handler for GET /objects/... */
  async serveObjectEntity(
    reqPath: string,
    userId: string | undefined,
    res: Response,
  ): Promise<void> {
    if (!userOwnsHealthDocumentPath(reqPath, userId)) {
      res.status(401).json({ error: "Unauthorized access to document" });
      return;
    }
    try {
      await streamS3HealthDocument(reqPath, res);
    } catch (e) {
      console.error("S3 document stream error:", e);
      if (!res.headersSent) {
        res.status(404).json({ error: "Document not found" });
      }
    }
  }
}
