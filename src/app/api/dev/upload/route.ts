/**
 * /api/dev/upload
 *
 * Development-only file upload endpoint.
 * Replaces S3 presigned PUT URLs when S3_ENDPOINT is not configured.
 * Files are saved to public/uploads/ and served as static assets.
 *
 * NEVER expose this route in production — it is guarded by NODE_ENV check.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  // Sanitise the key: flatten slashes to double-underscore (matches localKeyToPath)
  const safeKey = key.replace(/\//g, "__").replace(/\.\./g, "");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, safeKey);

  const arrayBuffer = await req.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  return new NextResponse(null, { status: 200 });
}
