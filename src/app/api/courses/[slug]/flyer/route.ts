import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";

interface Props { params: { slug: string } }

/**
 * Public endpoint - no auth required.
 * Returns a redirect to a short-lived signed S3 URL for the course flyer.
 * The flyer file itself is stored in S3 and served via the signed URL.
 */
export async function GET(_req: Request, { params }: Props) {
  const course = await db.course.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
    select: { flyerS3Key: true, title: true },
  });

  if (!course?.flyerS3Key) {
    return NextResponse.json({ error: "No flyer available" }, { status: 404 });
  }

  const url = await getPresignedDownloadUrl(course.flyerS3Key, 300); // 5-minute link
  return NextResponse.redirect(url);
}
