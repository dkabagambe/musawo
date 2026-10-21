import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadBuffer, deleteObject } from "@/lib/s3";
import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_SIZE = 256; // px — square
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not parse form data" }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP or GIF images are accepted." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Resize and convert to JPEG
  let processed: Buffer;
  try {
    processed = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Image could not be processed. Please try a different file." }, { status: 400 });
  }

  const s3Key = `avatars/${session.user.id}.jpg`;

  try {
    await uploadBuffer(s3Key, processed, "image/jpeg");
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  // Build a public-ish URL via the app's own proxy route
  // (avoids exposing S3 credentials in the browser)
  const avatarUrl = `/api/profile/avatar/${session.user.id}`;

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

// Serve the avatar through the app so the S3 key is never exposed
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("uid");
  if (!userId) return new NextResponse("Not found", { status: 404 });

  const { getInlineObject } = await import("@/lib/s3");
  try {
    const { body, contentType } = await getInlineObject(`avatars/${userId}.jpg`);
    return new NextResponse(body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
