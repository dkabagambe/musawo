import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

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

    // Check enrolment exists and is suspended
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

    if (enrolment.status !== "SUSPENDED") {
      return NextResponse.json(
        { error: "Enrolment is not currently on hold" },
        { status: 400 }
      );
    }

    // Determine new status based on payment
    let newStatus = "ACTIVE";
    if (enrolment.paidAmountUgx === 0) {
      newStatus = "PENDING_PAYMENT";
    } else if (enrolment.paidAmountUgx < enrolment.totalAmountUgx) {
      newStatus = "PARTIALLY_PAID";
    }

    // Update enrolment status
    await db.enrolment.update({
      where: { id: body.enrolmentId },
      data: {
        status: newStatus as "ACTIVE" | "PENDING_PAYMENT" | "PARTIALLY_PAID",
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLog({
      action: "UPDATE",
      actorId: session.user.id,
      entityType: "enrolment",
      entityId: enrolment.id,
      details: {
        action: "hold_lifted",
        studentId: enrolment.userId,
        studentName: enrolment.user.name,
        courseId: enrolment.courseId,
        courseTitle: enrolment.course.title,
        reason: body.reason.trim(),
        holdLiftedBy: session.user.name,
        newStatus,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
    });

    // TODO: Send notification to student
    // await sendNotification({
    //   userId: enrolment.userId,
    //   title: "Payment Hold Lifted",
    //   body: `Your enrolment in ${enrolment.course.title} has been restored.`,
    // });

    return NextResponse.json({
      success: true,
      message: "Payment hold lifted successfully",
      enrolmentId: enrolment.id,
      newStatus,
    });
  } catch (error) {
    console.error("Error lifting payment hold:", error);
    return NextResponse.json(
      { error: "Failed to lift payment hold" },
      { status: 500 }
    );
  }
}
