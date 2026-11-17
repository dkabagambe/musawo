import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const BulkEnrolSchema = z.object({
  courseId: z.string().cuid(),
  intakeId: z.string().cuid(),
  studentIds: z.array(z.string().cuid()).min(1).max(100),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "enrolments.create"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = BulkEnrolSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { courseId, intakeId, studentIds } = parsed.data;

  // Verify course and intake exist
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, fullFeeUgx: true, instalmentCount: true, title: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const intake = await db.intake.findUnique({
    where: { id: intakeId },
    select: { id: true, courseId: true },
  });
  if (!intake || intake.courseId !== courseId)
    return NextResponse.json({ error: "Intake not found or mismatch" }, { status: 404 });

  // Verify all students exist and are STUDENT role
  const students = await db.user.findMany({
    where: { id: { in: studentIds }, role: "STUDENT" },
    select: { id: true, name: true },
  });
  if (students.length !== studentIds.length)
    return NextResponse.json(
      { error: "Some student IDs are invalid or not students" },
      { status: 400 },
    );

  // Check for existing enrolments to avoid duplicates
  const existing = await db.enrolment.findMany({
    where: {
      courseId,
      userId: { in: studentIds },
    },
    select: { userId: true },
  });

  const existingUserIds = new Set(existing.map((e) => e.userId));
  const newStudentIds = studentIds.filter((id) => !existingUserIds.has(id));

  if (newStudentIds.length === 0) {
    return NextResponse.json(
      { error: "All selected students are already enrolled in this course" },
      { status: 400 },
    );
  }

  // Determine total amount (use course fee or 0 if contact-only)
  const totalAmountUgx = course.fullFeeUgx ?? 0;

  // Create enrolments
  const enrolments = await db.enrolment.createMany({
    data: newStudentIds.map((userId) => ({
      userId,
      courseId,
      intakeId,
      totalAmountUgx,
      status: totalAmountUgx > 0 ? "PENDING_PAYMENT" : "ACTIVE",
      planType: "INSTALMENT",
      paidAmountUgx: 0,
      paidPercent: 0,
      unlockedBlockOrder: 0,
    })),
  });

  await audit({
    actor: session.user,
    action: "CREATE",
    resource: "enrolment_bulk",
    resourceId: courseId,
    details: {
      courseTitle: course.title,
      intakeId,
      studentCount: newStudentIds.length,
      skippedCount: existingUserIds.size,
    },
  });

  return NextResponse.json({
    success: true,
    created: enrolments.count,
    skipped: existingUserIds.size,
  });
}
