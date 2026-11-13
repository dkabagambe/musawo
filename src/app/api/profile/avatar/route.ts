import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_SIZE = 256; // px — square
const THUMB_SIZE = 64;   // px — square thumbnail
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

  // Validate file contents (not just extension) by attempting to parse with sharp
  let sharpInstance: sharp.Sharp;
  try {
    sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    if (!metadata.format || !["jpeg", "png", "webp", "gif"].includes(metadata.format)) {
      return NextResponse.json({ error: "Invalid image file. Please upload a valid JPEG, PNG, WebP, or GIF." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid image file. Please upload a valid image." }, { status: 400 });
  }

  // Process: auto-rotate, centre-crop square, resize to 256x256, convert to WebP, strip metadata
  let processedFull: Buffer;
  let processedThumb: Buffer;
  try {
    processedFull = await sharp(buffer)
      .rotate() // auto-rotate based on EXIF orientation
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();

    processedThumb = await sharp(buffer)
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Image could not be processed. Please try a different file." }, { status: 400 });
  }

  // Store in database (not S3 - ephemeral filesystem per spec)
  try {
    await db.userAvatar.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        contentType: "image/webp",
        bytes: processedFull,
        thumbBytes: processedThumb,
        sizeBytes: processedFull.length + processedThumb.length,
      },
      update: {
        contentType: "image/webp",
        bytes: processedFull,
        thumbBytes: processedThumb,
        sizeBytes: processedFull.length + processedThumb.length,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Avatar database write failed:", err);
    return NextResponse.json({ error: "Failed to save avatar. Please try again." }, { status: 500 });
  }

  // Build a proxy URL
  const avatarUrl = `/api/avatar/${session.user.id}`;

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.userAvatar.delete({
      where: { userId: session.user.id },
    });
    await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    });
  } catch {
    // Already deleted or never existed
  }

  return NextResponse.json({ success: true });
}

