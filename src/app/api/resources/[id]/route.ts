import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const resource = await db.resource.findUnique({
    where: { id: params.id, isPublic: true },
  });

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getPresignedDownloadUrl(resource.s3Key, 1800);
  return NextResponse.redirect(url);
}
