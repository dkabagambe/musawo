import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "students.lookup")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json(
      { error: "Enter at least two characters." },
      { status: 400 },
    );
  }

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { studentNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      studentNumber: true,
      phone: true,
      email: true,
      status: true,
      enrolments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          course: { select: { title: true } },
          intake: { select: { label: true } },
        },
      },
      studentInvites: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, expiresAt: true },
      },
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  const queryHash = createHash("sha256")
    .update(query.toLowerCase())
    .digest("hex");
  await audit({
    actorId: session.user.id,
    action: "STUDENT_LOOKUP",
    entityType: "StudentLookup",
    metadata: {
      queryHash,
      resultCount: students.length,
      studentIds: students.map((student) => student.id),
      via: canVia(session.user.role, "students.lookup"),
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({
    students: students.map(
      ({
        id,
        name,
        studentNumber,
        phone,
        email,
        status,
        enrolments,
        studentInvites,
      }) => ({
        id,
        name,
        studentNumber,
        phone,
        email,
        status,
        course: enrolments[0]?.course.title ?? null,
        intake: enrolments[0]?.intake?.label ?? null,
        pendingInvite: studentInvites[0] ?? null,
      }),
    ),
  });
}
