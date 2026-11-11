/**
 * GET  /api/tutor/assignments          - list assignments for tutor's courses
 * POST /api/tutor/assignments          - create a new assignment
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { z } from "zod";

const CreateSchema = z.object({
  courseId:   z.string().cuid(),
  title:      z.string().min(3).max(300),
  body:       z.string().min(10).max(10000),
  dueDate:    z.string().datetime().optional().nullable(),
  maxPoints:  z.number().int().min(1).max(100).default(100),
  status:     z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.upload"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignments = await db.assignment.findMany({
    where: { course: teachingCourseWhere(session.user.id) },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      _count: { select: { submissions: true } },
    },
  });
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.upload"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  // Verify this tutor teaches the course
  const course = await db.course.findFirst({
    where: { id: parsed.data.courseId, ...teachingCourseWhere(session.user.id) },
    select: { id: true, title: true },
  });
  if (!course)
    return NextResponse.json({ error: "Course not found or not assigned to you" }, { status: 403 });

  const assignment = await db.assignment.create({
    data: {
      courseId:   parsed.data.courseId,
      title:      parsed.data.title,
      instructions: parsed.data.body,
      dueDate:    parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      maxPoints:  parsed.data.maxPoints,
      status:     parsed.data.status,
    },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
