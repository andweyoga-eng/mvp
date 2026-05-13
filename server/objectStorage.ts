import { Storage, File } from "@google-cloud/storage";
import type { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import {
  assertS3Configured,
  presignHealthDocumentPut,
  s3UploadUrlToObjectPath,
  streamS3HealthDocument,
  userOwnsHealthDocumentPath,
  verifyS3HealthObjectExists,
} from "./s3HealthStorage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export type HealthObjectStorageBackend = "s3" | "replit";

let cachedBackend: HealthObjectStorageBackend | null = null;

/**
 * s3: S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, etc.)
 * replit: legacy Replit Object Storage + sidecar signed URLs
 */
export function getHealthObjectStorageBackend(): HealthObjectStorageBackend {
  const explicit = (process.env.OBJECT_STORAGE || "").trim().toLowerCase();
  if (explicit === "s3") {
    assertS3Configured();
    return "s3";
  }
  if (explicit === "replit") return "replit";

  const hasS3 =
    !!(process.env.S3_BUCKET || process.env.AWS_S3_BUCKET) &&
    !!process.env.AWS_ACCESS_KEY_ID?.trim() &&
    !!process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (hasS3) {
    assertS3Configured();
    return "s3";
  }

  if (process.env.PRIVATE_OBJECT_DIR?.trim()) return "replit";

  throw new Error(
    "Object storage is not configured. Use S3-compatible storage (recommended): OBJECT_STORAGE=s3, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION; for Cloudflare R2 add S3_ENDPOINT and S3_FORCE_PATH_STYLE=true. Legacy Replit: OBJECT_STORAGE=replit and PRIVATE_OBJECT_DIR (Replit sidecar required)."
  );
}

function backend(): HealthObjectStorageBackend {
  if (!cachedBackend) {
    cachedBackend = getHealthObjectStorageBackend();
  }
  return cachedBackend;
}

let replitGcsClient: Storage | null = null;

function getReplitGcsClient(): Storage {
  if (!replitGcsClient) {
    replitGcsClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  }
  return replitGcsClient;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  getPublicObjectSearchPaths(): Array<string> {
    if (backend() === "s3") {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS is only used with Replit object storage.");
    }
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    if (backend() === "s3") {
      throw new Error("PRIVATE_OBJECT_DIR is only used with Replit object storage.");
    }
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = getReplitGcsClient().bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Presigned PUT URL. For S3, `userId` is required (object key is scoped per user).
   */
  async getObjectEntityUploadURL(userId?: string): Promise<string> {
    if (backend() === "s3") {
      if (!userId) {
        throw new Error("Authenticated user id is required for document uploads.");
      }
      const { uploadUrl } = await presignHealthDocumentPut(userId);
      return uploadUrl;
    }

    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/health-documents/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signReplitObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (backend() === "s3") {
      throw new ObjectNotFoundError();
    }
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = getReplitGcsClient().bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (backend() === "s3") {
      if (rawPath.startsWith("https://") || rawPath.startsWith("http://")) {
        return s3UploadUrlToObjectPath(rawPath);
      }
      return rawPath;
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    if (backend() === "s3") {
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

    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  /** Download handler for GET /objects/... — supports S3 and Replit GCS. */
  async serveObjectEntity(
    reqPath: string,
    userId: string | undefined,
    res: Response
  ): Promise<void> {
    if (backend() === "s3") {
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
      return;
    }

    try {
      const objectFile = await this.getObjectEntityFile(reqPath);
      const canAccess = await this.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: ObjectPermission.READ,
      });

      if (!canAccess) {
        res.status(401).json({ error: "Unauthorized access to document" });
        return;
      }

      await this.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        if (!res.headersSent) {
          res.status(404).json({ error: "Document not found" });
        }
        return;
      }
      throw error;
    }
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName,
  };
}

async function signReplitObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL (HTTP ${response.status}). Replit object storage requires the Replit sidecar. For Railway or local servers, configure S3-compatible storage (see OBJECT_STORAGE=s3).`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
