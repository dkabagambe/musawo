import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { certificateId: string } }
) {
  const { certificateId } = params;

  if (!certificateId) {
    return NextResponse.json(
      { error: "Certificate ID is required" },
      { status: 400 }
    );
  }

  try {
    const certificate = await db.certificate.findUnique({
      where: { uniqueId: certificateId },
      include: {
        user: {
          select: {
            name: true,
            studentNumber: true,
          },
        },
        course: {
          select: {
            title: true,
            courseCode: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found", valid: false },
        { status: 404 }
      );
    }

    // Log verification attempt
    await db.certVerification.create({
      data: {
        certificateId: certificate.id,
        // Would capture IP and user agent in production
      },
    });

    // Check if revoked
    if (certificate.revokedAt) {
      return NextResponse.json({
        valid: false,
        revoked: true,
        certificate: {
          uniqueId: certificate.uniqueId,
          issuedAt: certificate.issuedAt,
          revokedAt: certificate.revokedAt,
          revokedReason: certificate.revokedReason,
          user: {
            name: certificate.user.name,
            studentNumber: certificate.user.studentNumber,
          },
          course: {
            title: certificate.course.title,
            courseCode: certificate.course.courseCode,
          },
        },
      });
    }

    return NextResponse.json({
      valid: true,
      revoked: false,
      certificate: {
        uniqueId: certificate.uniqueId,
        issuedAt: certificate.issuedAt,
        user: {
          name: certificate.user.name,
          studentNumber: certificate.user.studentNumber,
        },
        course: {
          title: certificate.course.title,
          courseCode: certificate.course.courseCode,
        },
      },
    });
  } catch (error) {
    console.error("Certificate verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}
