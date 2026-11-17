import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.issue")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { requests, reason } = body;

  if (!Array.isArray(requests) || requests.length === 0) {
    return NextResponse.json(
      { error: "requests array is required" },
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
    // Validate all requests have studentId and courseId
    for (const req of requests) {
      if (!req.studentId || !req.courseId) {
        return NextResponse.json(
          { error: "Each request must have studentId and courseId" },
          { status: 400 }
        );
      }
    }

    // Fetch student and course data for each request
    const studentIds = requests.map((r: any) => r.studentId);
    const courseIds = requests.map((r: any) => r.courseId);

    const students = await db.user.findMany({
      where: {
        id: { in: studentIds },
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentNumber: true,
      },
    });

    const courses = await db.course.findMany({
      where: {
        id: { in: courseIds },
      },
      select: {
        id: true,
        title: true,
        courseCode: true,
      },
    });

    const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
    const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

    // Create approval requests for Director
    const approvalRequests = await Promise.all(
      requests.map(async (req: any) => {
        const student = studentMap[req.studentId];
        const course = courseMap[req.courseId];

        if (!student || !course) {
          throw new Error(`Student or course not found for request`);
        }

        return db.approvalRequest.create({
          data: {
            type: "CERTIFICATE_ISSUANCE",
            status: "SUBMITTED",
            requestedById: session.user.id,
            description: `Certificate issuance for ${student.name} - ${course.courseCode}`,
            metadata: {
              studentId: student.id,
              studentName: student.name,
              studentNumber: student.studentNumber,
              studentEmail: student.email,
              courseId: course.id,
              courseTitle: course.title,
              courseCode: course.courseCode,
              principalReason: reason,
            },
          },
        });
      })
    );

    // Audit log for batch request
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CERTIFICATE_BATCH_REQUESTED",
        resource: "CERTIFICATES",
        details: {
          count: approvalRequests.length,
          requests: requests,
          reason,
          approvalRequestIds: approvalRequests.map((r) => r.id),
        },
      },
    });

    return NextResponse.json({
      success: true,
      requestCount: approvalRequests.length,
      approvalRequests: approvalRequests.map((r) => ({
        id: r.id,
        studentId: r.metadata.studentId,
        courseId: r.metadata.courseId,
      })),
    });
  } catch (error) {
    console.error("Batch certificate request error:", error);
    return NextResponse.json(
      { error: "Failed to create certificate requests" },
      { status: 500 }
    );
  }
}
