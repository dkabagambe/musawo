import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { CertificatePDF } from "@/lib/pdf/certificate";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { uniqueId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cert = await db.certificate.findUnique({
    where: { uniqueId: params.uniqueId },
    include: {
      user: { select: { id: true, name: true } },
      course: { select: { title: true, accreditationText: true } },
    },
  });

  if (!cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  if (cert.revokedAt) {
    return NextResponse.json({ error: "Certificate has been revoked" }, { status: 410 });
  }

  // Students may only download their own certificate
  const { role, id: userId } = session.user;
  if (role === "STUDENT" && cert.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If the cert has an S3 key, serve it directly via presigned URL
  if (cert.fileS3Key) {
    try {
      const url = await getPresignedDownloadUrl(cert.fileS3Key, 1800);
      return NextResponse.redirect(url);
    } catch {
      // S3 key invalid or not accessible - fall through to on-demand generation
    }
  }

  // On-demand PDF generation
  const issuerName = await getSetting("certificate.issuerName", "Musawo Training Center");

  const pdf = await renderToBuffer(
    <CertificatePDF
      studentName={cert.user.name}
      courseTitle={cert.course.title}
      issuedAt={cert.issuedAt}
      uniqueId={cert.uniqueId}
      accreditationText={cert.course.accreditationText ?? undefined}
      issuerName={issuerName}
    />
  );

  const safeName = cert.user.name.replace(/[^a-z0-9]/gi, "-").slice(0, 40).toLowerCase();

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${safeName}.pdf"`,
    },
  });
}
