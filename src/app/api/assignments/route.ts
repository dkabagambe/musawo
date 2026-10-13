import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

/** GET /api/assignments — assignments for the student's enrolled courses */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const assignments = await db.assignment.findMany({
    where: { courseId: { in: courseIds }, status: "PUBLISHED" },
    orderBy: { dueDate: "asc" },
    include: {
      course: { select: { title: true, slug: true } },
      submissions: {
        where: { userId: session.user.id },
        select: { id: true, status: true, grade: true, submittedAt: true },
      },
    },
  });

  return NextResponse.json({ assignments });
}

const SubmitSchema = z.object({
  assignmentId: z.string().cuid(),
  textBody:     z.string().max(20000).optional(),
  fileS3Key:    z.string().max(500).optional(),
});

/** POST /api/assignments — submit an assignment */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { assignmentId, textBody, fileS3Key } = parsed.data;

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId, status: "PUBLISHED" },
    select: { courseId: true },
  });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const enrolled = await db.enrolment.findFirst({
    where: { userId: session.user.id, courseId: assignment.courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
  });
  if (!enrolled) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });

  const submission = await db.assignmentSubmission.upsert({
    where: { assignmentId_userId: { assignmentId, userId: session.user.id } },
    update: { textBody, fileS3Key, submittedAt: new Date(), status: "SUBMITTED" },
    create: { assignmentId, userId: session.user.id, textBody, fileS3Key },
  });

  return NextResponse.json({ submission }, { status: 201 });
}
