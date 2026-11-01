/**
 * Group work submissions for a live class.
 *
 * GET   /api/groups/[classId]/work  - list submissions for instructor; own group for student
 * POST  /api/groups/[classId]/work  - student submits group work
 * PATCH /api/groups/[classId]/work  - instructor grades a submission
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;
  const lc = await db.liveClass.findUnique({ where: { id: classId }, select: { courseId: true, tutorId: true } });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const isInstructor = can(session.user.role, "classes.manage") && lc.tutorId === session.user.id;
  const isStaff = can(session.user.role, "classes.view") && !can(session.user.role, "classes.join");

  if (isInstructor || isStaff) {
    const submissions = await db.groupWorkSubmission.findMany({
      where: { liveClassId: classId },
      include: {
        group: {
          include: { members: { include: { user: { select: { id: true, name: true } } } } },
        },
      },
      orderBy: { submittedAt: "asc" },
    });
    return NextResponse.json({ submissions });
  }

  // Student: find their group
  const membership = await db.classGroupMember.findFirst({
    where: { userId: session.user.id, group: { liveClassId: classId } },
    select: { groupId: true },
  });
  if (!membership) return NextResponse.json({ submissions: [] });

  const submissions = await db.groupWorkSubmission.findMany({
    where: { groupId: membership.groupId, liveClassId: classId },
    include: { group: { select: { name: true } } },
  });
  return NextResponse.json({ submissions });
}

const SubmitWorkSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;
  const lc = await db.liveClass.findUnique({ where: { id: classId }, select: { courseId: true } });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  if (!can(session.user.role, "classes.join")) {
    return NextResponse.json({ error: "Only students can submit group work" }, { status: 403 });
  }

  const membership = await db.classGroupMember.findFirst({
    where: { userId: session.user.id, group: { liveClassId: classId } },
    select: { groupId: true },
  });
  if (!membership) return NextResponse.json({ error: "You are not in a group for this class" }, { status: 403 });

  const body = SubmitWorkSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const submission = await db.groupWorkSubmission.upsert({
    where: { groupId_liveClassId: { groupId: membership.groupId, liveClassId: classId } },
    update: { title: body.data.title, body: body.data.body, submittedAt: new Date() },
    create: {
      groupId: membership.groupId,
      liveClassId: classId,
      title: body.data.title,
      body: body.data.body,
    },
  });

  return NextResponse.json(submission, { status: 201 });
}

const GradeWorkSchema = z.object({
  submissionId: z.string().cuid(),
  groupMark: z.number().int().min(0).max(100),
  // [{userId, mark, note}]
  individualMarks: z
    .array(
      z.object({
        userId: z.string(),
        mark: z.number().int().min(0).max(100),
        note: z.string().optional(),
      })
    )
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;
  const lc = await db.liveClass.findUnique({ where: { id: classId }, select: { tutorId: true } });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  if (!can(session.user.role, "classes.manage") || lc.tutorId !== session.user.id) {
    return NextResponse.json({ error: "Only the class instructor may grade submissions" }, { status: 403 });
  }

  const body = GradeWorkSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { submissionId, groupMark, individualMarks } = body.data;

  const submission = await db.groupWorkSubmission.findFirst({
    where: { id: submissionId, liveClassId: classId },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const updated = await db.groupWorkSubmission.update({
    where: { id: submissionId },
    data: {
      groupMark,
      individualMarks: individualMarks ?? undefined,
      gradedAt: new Date(),
      gradedBy: session.user.id,
    },
  });

  return NextResponse.json(updated);
}
