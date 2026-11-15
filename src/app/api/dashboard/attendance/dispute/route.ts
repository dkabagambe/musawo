import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

const DisputeSchema = z.object({
  classId: z.string().cuid(),
  className: z.string().max(200),
  note: z.string().min(1).max(4000),
});

/**
 * POST /api/dashboard/attendance/dispute
 * A student reports a disputed attendance record. Creates an in-app
 * notification to the instructor of that class so they can review.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "classes.join"))
    return NextResponse.json({ error: "Student account required" }, { status: 403 });

  const parsed = DisputeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { classId, className, note } = parsed.data;

  // Verify the student is enrolled in this class's course
  const liveClass = await db.liveClass.findUnique({
    where: { id: classId },
    select: { courseId: true, tutorId: true, title: true, scheduledAt: true },
  });
  if (!liveClass)
    return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const enrolment = await db.enrolment.findUnique({
    where: {
      userId_courseId: { userId: session.user.id, courseId: liveClass.courseId },
    },
    select: { id: true },
  });
  if (!enrolment)
    return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });

  // Create a notification to the instructor
  await db.notification.create({
    data: {
      userId: liveClass.tutorId,
      channel: "IN_APP",
      type: "ATTENDANCE_DISPUTE",
      subject: `Attendance dispute: ${className}`,
      body: `${session.user.name ?? "A student"} has reported a disputed attendance record for "${liveClass.title}" on ${new Date(liveClass.scheduledAt).toLocaleDateString("en-UG")}.\n\nReason: ${note}`,
      metadata: {
        studentId: session.user.id,
        studentName: session.user.name,
        classId,
        className,
        note,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
