import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { Response } from "express";
import { Readable } from "stream";

let _client: S3Client | null = null;

export function getS3Bucket(): string {
  return (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "").trim();
}

function getS3Client(): S3Client {
  if (_client) return _client;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 mode: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or use OBJECT_STORAGE=replit)."
    );
  }
  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.S3_REGION?.trim() ||
    "us-east-1";
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const forcePathStyle =
    process.env.S3_FORCE_PATH_STYLE === "1" ||
    process.env.S3_FORCE_PATH_STYLE === "true" ||
    Boolean(endpoint);

  _client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
  });
  return _client;
}

export function assertS3Configured(): void {
  const bucket = getS3Bucket();
  if (!bucket) {
    throw new Error(
      "S3 mode: set S3_BUCKET (or AWS_S3_BUCKET). For Cloudflare R2, also set S3_ENDPOINT and often S3_FORCE_PATH_STYLE=true."
    );
  }
  getS3Client();
}

export async function presignHealthDocumentPut(
  userId: string
): Promise<{ uploadUrl: string; key: string }> {
  assertS3Configured();
  const bucket = getS3Bucket();
  const id = randomUUID();
  const key = `health-documents/${userId}/${id}`;
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
  return { uploadUrl, key };
}

/** Server-side upload (avoids browser CORS issues with presigned PUT). */
export async function putHealthDocumentBuffer(
  userId: string,
  body: Buffer,
  contentType: string,
): Promise<{ objectPath: string; key: string }> {
  assertS3Configured();
  const bucket = getS3Bucket();
  const id = randomUUID();
  const key = `health-documents/${userId}/${id}`;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { objectPath: `/objects/${key}`, key };
}

/**
 * Map a full object URL (no query string) to internal path /objects/health-documents/{userId}/{id}
 */
export function s3UploadUrlToObjectPath(fullUrl: string): string {
  const key = extractKeyFromS3Url(fullUrl);
  return `/objects/${key}`;
}

function extractKeyFromS3Url(urlString: string): string {
  const bucket = getS3Bucket();
  const u = new URL(urlString);

  // Path-style: .../bucket/key or R2 .../bucket/key
  const segs = u.pathname.split("/").filter(Boolean);
  if (segs[0] === bucket && segs.length >= 2) {
    return segs.slice(1).join("/");
  }

  // Virtual-hosted: bucket.s3.<region>.amazonaws.com/key
  if (
    u.hostname.startsWith(`${bucket}.`) &&
    u.hostname.includes("amazonaws.com")
  ) {
    return decodeURIComponent(u.pathname.replace(/^\//, ""));
  }

  // Some hosts: first path segment is not bucket (already key-only)
  if (segs.length >= 2 && segs[0] === "health-documents") {
    return segs.join("/");
  }

  throw new Error(
    "Could not resolve S3 object key from upload URL. Check S3_BUCKET matches your bucket name."
  );
}

/** /objects/health-documents/{userId}/{uuid} */
export function parseHealthDocumentObjectPath(objectPath: string): {
  userId: string;
  objectId: string;
} | null {
  const m = objectPath.match(
    /^\/objects\/health-documents\/([^/]+)\/([^/]+)$/
  );
  if (!m) return null;
  return { userId: m[1], objectId: m[2] };
}

export function userOwnsHealthDocumentPath(
  objectPath: string,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  const parsed = parseHealthDocumentObjectPath(objectPath);
  return parsed?.userId === userId;
}

export async function verifyS3HealthObjectExists(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new HeadObjectCommand({ Bucket: getS3Bucket(), Key: key })
  );
}

export async function streamS3HealthDocument(
  objectPath: string,
  res: Response
): Promise<void> {
  const key = objectPath.replace(/^\/objects\//, "");
  const client = getS3Client();
  const out = await client.send(
    new GetObjectCommand({ Bucket: getS3Bucket(), Key: key })
  );

  const contentType = out.ContentType || "application/octet-stream";
  const len = out.ContentLength;
  res.set({
    "Content-Type": contentType,
    ...(typeof len === "number" ? { "Content-Length": String(len) } : {}),
    "Cache-Control": "private, max-age=3600",
  });

  const body = out.Body;
  const streamBody = body as Readable | undefined;
  if (streamBody && typeof streamBody.pipe === "function") {
    streamBody.on("error", (err) => {
      console.error("S3 stream error:", err);
      if (!res.headersSent) res.status(500).end();
    });
    streamBody.pipe(res);
    return;
  }

  res.status(500).json({ error: "Unexpected S3 body type" });
}
