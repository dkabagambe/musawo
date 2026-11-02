import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Dev-mode local filesystem storage ───────────────────────────────────────
// When S3_ENDPOINT is not set we fall back to storing files in public/uploads/
// so that development and staging demos work without cloud credentials.
// In production with no S3_ENDPOINT we log a warning and treat uploads as disabled.
const IS_DEMO = !process.env.S3_ENDPOINT && process.env.APP_ENV !== "production";
const IS_LOCAL_DEV = IS_DEMO;

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
  // Staging demo: S3 not configured → return a sentinel the UI can detect
  if (!process.env.S3_ENDPOINT) {
    console.warn("[s3] Upload disabled: S3_ENDPOINT not configured (demo mode)");
    return `/api/dev/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}&disabled=1`;
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

/**
 * Get the size in bytes of a single object.
 * Returns 0 if the object does not exist or we are in local-dev mode.
 */
export async function headObjectSize(key: string): Promise<number> {
  if (IS_LOCAL_DEV) {
    const fs = require("fs") as typeof import("fs");
    const filePath = localKeyToPath(key);
    if (!fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
  }
  try {
    const result = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    return result.ContentLength ?? 0;
  } catch {
    return 0;
  }
}

export interface S3ObjectInfo {
  key: string;
  sizeBytes: number;
  lastModified?: Date;
}

/**
 * List all objects under a prefix. Returns at most 1000 per page;
 * iterates pages internally for full results up to 10 000 objects.
 */
export async function listObjectsByPrefix(
  prefix: string,
): Promise<S3ObjectInfo[]> {
  if (IS_LOCAL_DEV) {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const dir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(dir)) return [];
    const flat = prefix.replace(/\//g, "__");
    const files = fs.readdirSync(dir).filter((f: string) => f.startsWith(flat));
    return files.map((f: string) => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      return {
        key: f.replace(/__/g, "/"),
        sizeBytes: stat.size,
        lastModified: stat.mtime,
      };
    });
  }
  const results: S3ObjectInfo[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents ?? []) {
      results.push({
        key: obj.Key ?? "",
        sizeBytes: obj.Size ?? 0,
        lastModified: obj.LastModified,
      });
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken && results.length < 10_000);
  return results;
}
