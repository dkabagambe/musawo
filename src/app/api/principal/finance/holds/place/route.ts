import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "payments.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { enrolmentId: string; reason: string };
    
    if (!body.enrolmentId || !body.reason || body.reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Enrolment ID and reason (minimum 10 characters) required" },
        { status: 400 }
      );
    }

    // Check enrolment exists
    const enrolment = await db.enrolment.findUnique({
      where: { id: body.enrolmentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    if (!enrolment) {
      return NextResponse.json({ error: "Enrolment not found" }, { status: 404 });
    }

    // Check if already on hold
    if (enrolment.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Enrolment already suspended/on hold" },
        { status: 400 }
      );
    }

    // Update enrolment status to SUSPENDED
    await db.enrolment.update({
      where: { id: body.enrolmentId },
      data: {
        status: "SUSPENDED",
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLog({
      action: "ENROLMENT_SUSPENDED",
      actorId: session.user.id,
      entityType: "enrolment",
      entityId: enrolment.id,
      details: {
        studentId: enrolment.userId,
        studentName: enrolment.user.name,
        courseId: enrolment.courseId,
        courseTitle: enrolment.course.title,
        reason: body.reason.trim(),
        holdPlacedBy: session.user.name,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    });

    // TODO: Send notification to student
    // await sendNotification({
    //   userId: enrolment.userId,
    //   title: "Payment Hold Placed",
    //   body: `Your enrolment in ${enrolment.course.title} has been placed on hold. Reason: ${body.reason}`,
    // });

    return NextResponse.json({
      success: true,
      message: "Payment hold placed successfully",
      enrolmentId: enrolment.id,
    });
  } catch (error) {
    console.error("Error placing payment hold:", error);
    return NextResponse.json(
      { error: "Failed to place payment hold" },
      { status: 500 }
    );
  }
}
