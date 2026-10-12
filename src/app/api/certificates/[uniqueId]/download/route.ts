import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { uniqueId: string } }
) {
  const cert = await db.certificate.findUnique({
    where: { uniqueId: params.uniqueId },
    select: { fileS3Key: true, revokedAt: true, uniqueId: true },
  });

  if (!cert || !cert.fileS3Key) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  if (cert.revokedAt) {
    return NextResponse.json({ error: "Certificate has been revoked" }, { status: 410 });
  }

  const url = await getPresignedDownloadUrl(cert.fileS3Key, 1800);
  return NextResponse.redirect(url);
}
