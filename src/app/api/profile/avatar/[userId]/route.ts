import { NextRequest, NextResponse } from "next/server";
import { getInlineObject } from "@/lib/s3";

/**
 * Serve a user avatar from S3 without exposing S3 keys.
 * URL: /api/profile/avatar/{userId}
 * Cached for 1 hour in the browser; stale-while-revalidate 24 h.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const { userId } = params;
  if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return new NextResponse("Not found", { status: 404 });
  }

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
