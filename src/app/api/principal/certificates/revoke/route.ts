import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.revoke")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { certificateId, reason } = body;

  if (!certificateId) {
    return NextResponse.json(
      { error: "certificateId is required" },
      { status: 400 }
    );
  }

  if (!reason?.trim() || reason.trim().length < 10) {
    return NextResponse.json(
      { error: "Reason is required (minimum 10 characters)" },
      { status: 400 }
    );
  }

  try {
    // Verify certificate exists and is active
    const certificate = await db.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentNumber: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            courseCode: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    if (certificate.revokedAt) {
      return NextResponse.json(
        { error: "Certificate is already revoked" },
        { status: 400 }
      );
    }

    // Create approval request for Director
    const approvalRequest = await db.approvalRequest.create({
      data: {
        type: "CERTIFICATE_REVOCATION",
        status: "SUBMITTED",
        requestedById: session.user.id,
        description: `Certificate revocation: ${certificate.user.name} - ${certificate.course.courseCode}`,
        metadata: {
          certificateId: certificate.id,
          certificateNumber: certificate.uniqueId,
          studentId: certificate.userId,
          studentName: certificate.user.name,
          studentNumber: certificate.user.studentNumber,
          studentEmail: certificate.user.email,
          courseId: certificate.courseId,
          courseName: certificate.course.title,
          courseCode: certificate.course.courseCode,
          reason,
        },
      },
    });

    // Audit log for revocation request
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CERTIFICATE_REVOCATION_REQUESTED",
        resource: "CERTIFICATES",
        resourceId: certificateId,
        details: {
          certificateNumber: certificate.uniqueId,
          studentId: certificate.userId,
          studentName: certificate.user.name,
          courseId: certificate.courseId,
          courseCode: certificate.course.courseCode,
          reason,
          approvalRequestId: approvalRequest.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      approvalRequestId: approvalRequest.id,
      message: "Revocation request sent to Director for approval",
    });
  } catch (error) {
    console.error("Certificate revocation request error:", error);
    return NextResponse.json(
      { error: "Failed to request certificate revocation" },
      { status: 500 }
    );
  }
}
