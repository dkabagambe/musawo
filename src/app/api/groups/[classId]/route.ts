/**
 * Breakaway group management for a live class (Section 9, remarks.md).
 *
 * GET  /api/groups/[classId]  - list groups with members
 * POST /api/groups/[classId]  - create / regenerate groups
 * PATCH /api/groups/[classId] - update a group (name, meetLink, move member)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { z } from "zod";

// ─── helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;

  // Must be instructor of this class OR enrolled student
  const lc = await db.liveClass.findUnique({ where: { id: classId }, select: { courseId: true, tutorId: true } });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const isInstructor = can(session.user.role, "classes.manage") && lc.tutorId === session.user.id;
  const isStaff = can(session.user.role, "classes.view") && !can(session.user.role, "classes.join");
  const isStudent = can(session.user.role, "classes.join");

  if (!isInstructor && !isStaff && !isStudent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isStudent) {
    const enrolment = await db.enrolment.findFirst({
      where: { userId: session.user.id, courseId: lc.courseId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
    });
    if (!enrolment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const groups = await db.classGroup.findMany({
    where: { liveClassId: classId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, studentId: true } } },
        orderBy: { createdAt: "asc" },
      },
      submissions: {
        select: { id: true, title: true, groupMark: true, gradedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // For students: identify their own group
  let myGroupId: string | null = null;
  if (isStudent) {
    const membership = await db.classGroupMember.findFirst({
      where: { userId: session.user.id, group: { liveClassId: classId } },
      select: { groupId: true },
    });
    myGroupId = membership?.groupId ?? null;
  }

  return NextResponse.json({ groups, myGroupId, isInstructor: isInstructor || isStaff });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const CreateGroupsSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("random"),
    groupSize: z.number().int().min(2).max(20).default(5),
    // optional: provide explicit group names (else auto-generated A, B, C…)
    names: z.array(z.string().min(1)).optional(),
  }),
  z.object({
    mode: z.literal("manual"),
    // groups: [{name, memberIds[]}]
    groups: z.array(
      z.object({
        name: z.string().min(1).max(80),
        memberIds: z.array(z.string()).min(1),
        meetLink: z.string().url().optional().nullable(),
      })
    ).min(1),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;

  const lc = await db.liveClass.findUnique({ where: { id: classId }, select: { courseId: true, tutorId: true, status: true } });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (!can(session.user.role, "classes.manage") || lc.tutorId !== session.user.id) {
    return NextResponse.json({ error: "Only the class instructor may manage groups" }, { status: 403 });
  }

  const body = CreateGroupsSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input", details: body.error.flatten() }, { status: 400 });

  // Get enrolled students for this class's course
  const enrolments = await db.enrolment.findMany({
    where: { courseId: lc.courseId, status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
    include: { user: { select: { id: true, name: true } } },
  });

  if (body.data.mode === "random") {
    const { groupSize, names } = body.data;
    const students = shuffle(enrolments.map((e) => e.user));
    const groupCount = Math.ceil(students.length / groupSize);
    const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Delete existing groups for this class then recreate
    await db.classGroup.deleteMany({ where: { liveClassId: classId } });

    const createdGroups = await Promise.all(
      Array.from({ length: groupCount }).map(async (_, i) => {
        const groupName = names?.[i] ?? `Group ${ALPHA[i] ?? i + 1}`;
        const memberSlice = students.slice(i * groupSize, (i + 1) * groupSize);
        const group = await db.classGroup.create({
          data: {
            liveClassId: classId,
            name: groupName,
            members: {
              create: memberSlice.map((s) => ({ userId: s.id })),
            },
          },
          include: {
            members: { include: { user: { select: { id: true, name: true, studentId: true } } } },
          },
        });
        return group;
      })
    );

    return NextResponse.json({ groups: createdGroups }, { status: 201 });
  }

  // manual mode
  const { groups: groupDefs } = body.data;

  // Validate all memberIds are enrolled
  const enrolledIds = new Set(enrolments.map((e) => e.userId));
  const allMemberIds = groupDefs.flatMap((g) => g.memberIds);
  // Staff may also be added — just warn but allow
  const unknown = allMemberIds.filter((id) => !enrolledIds.has(id));
  if (unknown.length > 0) {
    // Check if they are staff (instructors can be in groups)
    const staffCheck = await db.user.count({ where: { id: { in: unknown }, role: { in: ["INSTRUCTOR", "PRINCIPAL", "ADMIN", "DIRECTOR"] } } });
    if (staffCheck !== unknown.length) {
      return NextResponse.json({ error: "Some members are not enrolled in this course" }, { status: 400 });
    }
  }

  await db.classGroup.deleteMany({ where: { liveClassId: classId } });

  const createdGroups = await Promise.all(
    groupDefs.map(async (g) => {
      const group = await db.classGroup.create({
        data: {
          liveClassId: classId,
          name: g.name,
          meetLink: g.meetLink ?? undefined,
          members: {
            create: g.memberIds.map((uid) => ({ userId: uid })),
          },
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, studentId: true } } } },
        },
      });
      return group;
    })
  );

  return NextResponse.json({ groups: createdGroups }, { status: 201 });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const PatchGroupSchema = z.object({
  groupId: z.string().cuid(),
  action: z.enum(["rename", "set_meet_link", "add_member", "remove_member"]),
  name: z.string().min(1).max(80).optional(),
  meetLink: z.string().url().optional().nullable(),
  userId: z.string().optional(),
  targetGroupId: z.string().cuid().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { classId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = params;
  const lc = await db.liveClass.findUnique({ where: { id: classId }, select: { tutorId: true } });
  if (!lc) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (!can(session.user.role, "classes.manage") || lc.tutorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = PatchGroupSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { groupId, action, name, meetLink, userId, targetGroupId } = body.data;

  // Verify group belongs to this class
  const group = await db.classGroup.findFirst({ where: { id: groupId, liveClassId: classId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  if (action === "rename" && name) {
    const updated = await db.classGroup.update({ where: { id: groupId }, data: { name } });
    return NextResponse.json(updated);
  }

  if (action === "set_meet_link") {
    const updated = await db.classGroup.update({ where: { id: groupId }, data: { meetLink: meetLink ?? null } });
    return NextResponse.json(updated);
  }

  if (action === "add_member" && userId) {
    const member = await db.classGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId },
    });
    return NextResponse.json(member);
  }

  if (action === "remove_member" && userId) {
    // If targetGroupId given, move the member there
    await db.classGroupMember.deleteMany({ where: { groupId, userId } });
    if (targetGroupId) {
      const target = await db.classGroup.findFirst({ where: { id: targetGroupId, liveClassId: classId } });
      if (target) {
        await db.classGroupMember.upsert({
          where: { groupId_userId: { groupId: targetGroupId, userId } },
          update: {},
          create: { groupId: targetGroupId, userId },
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
