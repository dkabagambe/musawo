import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const CreateAnnouncementSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(2000),
  audienceType: z.enum(["STAFF", "STUDENTS", "COURSE", "INTAKE", "CLASS", "ALL"]),
  targetCourseId: z.string().cuid().nullable().optional(),
  targetIntakeId: z.string().cuid().nullable().optional(),
  targetClassId: z.string().cuid().nullable().optional(),
  channel: z.enum(["IN_APP", "EMAIL"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "announcements.create"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateAnnouncementSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { title, body, audienceType, targetCourseId, targetIntakeId, targetClassId, channel } = parsed.data;

  // Institution-wide announcements require Principal approval
  const needsApproval = audienceType === "ALL";
  const status = needsApproval ? "PENDING_APPROVAL" : "PUBLISHED";

  // Create announcement
  const announcement = await db.announcement.create({
    data: {
      title,
      body,
      audienceType,
      targetCourseId: targetCourseId ?? null,
      targetIntakeId: targetIntakeId ?? null,
      targetClassId: targetClassId ?? null,
      status,
      createdById: session.user.id,
      publishedAt: needsApproval ? null : new Date(),
    },
  });

  // Audit log
  await audit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: {
      audienceType,
      status,
      via: canVia(session.user.role, "announcements.create"),
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  if (needsApproval) {
    // Create approval request for Principal
    const principals = await db.user.findMany({
      where: { role: "PRINCIPAL", status: "ACTIVE" },
      select: { id: true },
    });

    if (principals.length > 0) {
      await db.approvalRequest.create({
        data: {
          type: "INSTITUTION_ANNOUNCEMENT",
          requestorId: session.user.id,
          entityId: announcement.id,
          status: "PENDING",
          metadata: { title, audienceType, channel },
        },
      });

      // Notify Principal
      await db.notification.createMany({
        data: principals.map((principal) => ({
          userId: principal.id,
          channel: "IN_APP",
          type: "APPROVAL_REQUIRED",
          subject: "Institution-wide announcement awaits approval",
          body: `Admin has submitted: ${title}`,
          metadata: { announcementId: announcement.id },
        })),
      });
    }

    return NextResponse.json(
      { id: announcement.id, status: "PENDING_APPROVAL", message: "Submitted for Principal approval" },
      { status: 201 }
    );
  }

  // Send immediately for non-institution-wide announcements
  await sendAnnouncement(announcement.id, audienceType, targetCourseId, targetIntakeId, targetClassId, channel, title, body);

  return NextResponse.json(
    { id: announcement.id, status: "PUBLISHED", message: "Announcement sent" },
    { status: 201 }
  );
}

async function sendAnnouncement(
  announcementId: string,
  audienceType: string,
  targetCourseId: string | null | undefined,
  targetIntakeId: string | null | undefined,
  targetClassId: string | null | undefined,
  channel: string,
  title: string,
  body: string
) {
  // Determine recipients
  let recipients: { id: string }[] = [];

  if (audienceType === "STAFF") {
    recipients = await db.user.findMany({
      where: {
        status: "ACTIVE",
        role: { in: ["DIRECTOR", "PRINCIPAL", "INSTRUCTOR", "ADMIN"] },
      },
      select: { id: true },
    });
  } else if (audienceType === "STUDENTS") {
    recipients = await db.user.findMany({
      where: { status: "ACTIVE", role: "STUDENT" },
      select: { id: true },
    });
  } else if (audienceType === "COURSE" && targetCourseId) {
    // Students enrolled in this course
    const enrolments = await db.enrolment.findMany({
      where: { courseId: targetCourseId, status: "ACTIVE" },
      select: { student: { select: { userId: true } } },
    });
    recipients = enrolments.map((e) => ({ id: e.student.userId }));
  } else if (audienceType === "INTAKE" && targetIntakeId) {
    // Students in this intake
    const students = await db.student.findMany({
      where: { intakeId: targetIntakeId },
      select: { userId: true },
    });
    recipients = students.map((s) => ({ id: s.userId }));
  } else if (audienceType === "CLASS" && targetClassId) {
    // Students in this class
    const members = await db.classStudent.findMany({
      where: { classId: targetClassId },
      select: { student: { select: { userId: true } } },
    });
    recipients = members.map((m) => ({ id: m.student.userId }));
  } else if (audienceType === "ALL") {
    recipients = await db.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
  }

  // Create notifications
  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        channel: channel as "IN_APP" | "EMAIL",
        type: "ANNOUNCEMENT",
        subject: title,
        body,
        metadata: { announcementId },
      })),
    });
  }
}
