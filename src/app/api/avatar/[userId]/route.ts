import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Serve a user avatar from the database.
 * URL: /api/avatar/{userId}?size=thumb|full
 * 
 * Authentication required: only logged-in users can view avatars.
 * Caching: ETag based on updatedAt timestamp, Cache-Control private with revalidation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  // Authentication required
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { userId } = params;
  if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const size = req.nextUrl.searchParams.get("size") ?? "full";
  if (size !== "full" && size !== "thumb") {
    return new NextResponse("Invalid size parameter. Use 'full' or 'thumb'.", { status: 400 });
  }

  try {
    const avatar = await db.userAvatar.findUnique({
      where: { userId },
      select: {
        bytes: size === "full",
        thumbBytes: size === "thumb",
        contentType: true,
        updatedAt: true,
      },
    });

    if (!avatar) {
      return new NextResponse("Not found", { status: 404 });
    }

    const imageBytes = size === "full" ? avatar.bytes : avatar.thumbBytes;
    if (!imageBytes) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Generate ETag from updatedAt timestamp
    const etag = `"${crypto.createHash("md5").update(avatar.updatedAt.toISOString()).digest("hex")}"`;
    
    // Check If-None-Match header
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(imageBytes, {
      headers: {
        "Content-Type": avatar.contentType,
        "Cache-Control": "private, max-age=3600, must-revalidate",
        "ETag": etag,
      },
    });
  } catch (err) {
    console.error("Avatar fetch failed:", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
