import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "students.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { enrolmentId, newIntakeId, reason } = await req.json();

    if (!enrolmentId) {
      return NextResponse.json(
        { error: "Enrolment ID is required" },
        { status: 400 },
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Reason is required for moving students" },
        { status: 400 },
      );
    }

    const enrolment = await db.enrolment.findUnique({
      where: { id: enrolmentId },
      include: {
        user: { select: { id: true, name: true } },
        intake: { select: { id: true, label: true } },
      },
    });

    if (!enrolment) {
      return NextResponse.json({ error: "Enrolment not found" }, { status: 404 });
    }

    // If newIntakeId is null, remove from class (unenroll)
    if (!newIntakeId) {
      await db.enrolment.delete({
        where: { id: enrolmentId },
      });

      // Create audit log for removal
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "students.remove_from_class",
          details: {
            studentId: enrolment.userId,
            studentName: enrolment.user.name,
            fromIntakeId: enrolment.intakeId,
            fromIntakeLabel: enrolment.intake?.label,
            reason,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Student removed from class",
      });
    }

    // Moving to a different intake
    const newIntake = await db.intake.findUnique({
      where: { id: newIntakeId },
      include: { _count: { select: { enrolments: true } } },
    });

    if (!newIntake) {
      return NextResponse.json(
        { error: "Target intake not found" },
        { status: 404 },
      );
    }

    // Check if there are seats available
    if (newIntake._count.enrolments >= newIntake.seats) {
      return NextResponse.json(
        { error: "Target intake is full" },
        { status: 400 },
      );
    }

    // Update the enrolment
    await db.enrolment.update({
      where: { id: enrolmentId },
      data: { intakeId: newIntakeId },
    });

    // Create audit log for move
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "students.move_between_classes",
        details: {
          studentId: enrolment.userId,
          studentName: enrolment.user.name,
          fromIntakeId: enrolment.intakeId,
          fromIntakeLabel: enrolment.intake?.label,
          toIntakeId: newIntakeId,
          toIntakeLabel: newIntake.label,
          reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student moved successfully",
    });
  } catch (error: any) {
    console.error("Error moving student:", error);
    return NextResponse.json(
      { error: error.message || "Failed to move student" },
      { status: 500 },
    );
  }
}
