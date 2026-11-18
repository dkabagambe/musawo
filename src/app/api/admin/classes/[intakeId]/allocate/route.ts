import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { intakeId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "students.create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { studentIds, courseId } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Student IDs are required" },
        { status: 400 },
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 },
      );
    }

    const intake = await db.intake.findUnique({
      where: { id: params.intakeId },
      include: { _count: { select: { enrolments: true } } },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // Check if there are enough seats
    const availableSeats = intake.seats - intake._count.enrolments;
    if (studentIds.length > availableSeats) {
      return NextResponse.json(
        {
          error: `Only ${availableSeats} seats available. Cannot allocate ${studentIds.length} students.`,
        },
        { status: 400 },
      );
    }

    // Create enrolments
    const enrolments = await db.$transaction(
      studentIds.map((studentId) =>
        db.enrolment.create({
          data: {
            userId: studentId,
            courseId,
            intakeId: params.intakeId,
            status: "PENDING_PAYMENT",
          },
        }),
      ),
    );

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "students.allocate",
        details: {
          intakeId: params.intakeId,
          courseId,
          studentIds,
          count: studentIds.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: enrolments.length,
    });
  } catch (error: any) {
    console.error("Error allocating students:", error);
    return NextResponse.json(
      { error: error.message || "Failed to allocate students" },
      { status: 500 },
    );
  }
}
