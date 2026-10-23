import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Dev-mode local filesystem storage ───────────────────────────────────────
// When S3_ENDPOINT is not set we fall back to storing files in public/uploads/
// so that development works without any cloud / MinIO credentials.
const IS_LOCAL_DEV =
  !process.env.S3_ENDPOINT && process.env.NODE_ENV !== "production";

// ─── Real S3 / MinIO client ───────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "dev",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "dev",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET ?? "mtc-files";

// ─── Local-dev helpers ────────────────────────────────────────────────────────

function localKeyToPath(key: string) {
  // Dynamic import to avoid pulling 'path' / 'fs' into edge bundles
  const path = require("path") as typeof import("path");
  const cwd = process.cwd();
  return path.join(cwd, "public", "uploads", key.replace(/\//g, "__"));
}

export function localKeyToUrl(key: string) {
  // Served at /uploads/<flattened-key> by Next.js static file serving
  return `/uploads/${key.replace(/\//g, "__")}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 1800,
): Promise<string> {
  if (IS_LOCAL_DEV) return localKeyToUrl(key);
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Read an object through the application so student material URLs never expose
 * S3 credentials or keys.
 */
export async function getInlineObject(key: string) {
  if (IS_LOCAL_DEV) {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const filePath = localKeyToPath(key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    const contentType = mimeMap[ext] ?? "application/octet-stream";
    // Convert Buffer to a Web ReadableStream
    const { Readable } = require("stream") as typeof import("stream");
    const nodeStream = Readable.from(buffer);
    const web = require("stream/web") as typeof import("stream/web");
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return {
      body: webStream,
      contentType,
      contentLength: buffer.byteLength,
    };
  }

  const { Body, ContentType, ContentLength } = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: "inline",
    }),
  );
  if (!Body) throw new Error("Object has no body");
  return {
    body: Body.transformToWebStream(),
    contentType: ContentType ?? "application/octet-stream",
    contentLength: ContentLength,
  };
}

/**
 * In dev mode: returns a special /api/dev/upload?key=… URL that the browser
 * PUTs to, which is handled by the dev-upload API route that saves to disk.
 * In production: returns a real S3 presigned PUT URL.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
): Promise<string> {
  if (IS_LOCAL_DEV) {
    return `/api/dev/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`;
  }
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  if (IS_LOCAL_DEV) {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const filePath = localKeyToPath(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return;
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  if (IS_LOCAL_DEV) {
    const fs = require("fs") as typeof import("fs");
    const filePath = localKeyToPath(key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
