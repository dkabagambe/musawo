import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { z } from "zod";
import { checkRateLimit, recordFailure } from "@/lib/auth/rate-limit";

const BroadcastSchema = z.object({
  targetType: z.enum(["course", "class", "group"]),
  targetId: z.string().cuid("Invalid target ID"),
  body: z.string().min(1).max(2000, "Message too long"),
  label: z.string().max(80).optional(),
});

/**
 * POST /api/conversations/broadcast
 * Tutor sends a message to all students in a course, class, or group.
 * Creates individual conversations per student; replies come back privately.
 * Rate limited: 5 broadcasts per 10 minutes.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "messaging.students.own")) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  // Rate limit broadcasts: 5 per 10 minutes
  const rl = await checkRateLimit({
    key: `broadcast:${session.user.id}`,
    maxRequests: 5,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many broadcasts. Please wait before sending another." }, { status: 429 });
  }

  const parsed = BroadcastSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { targetType, targetId, body, label } = parsed.data;

  // Gather recipient student IDs scoped to this instructor
  let studentIds: string[] = [];
  let broadcastLabel = label ?? "";

  if (targetType === "course") {
    // Verify this instructor teaches this course
    const course = await db.course.findFirst({
      where: { id: targetId, ...teachingCourseWhere(session.user.id) },
      select: { id: true, title: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found or not yours" }, { status: 404 });
    broadcastLabel = broadcastLabel || `Broadcast: ${course.title}`;

    const enrolments = await db.enrolment.findMany({
      where: {
        courseId: targetId,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID"] },
        user: { role: "STUDENT" },
      },
      select: { userId: true },
    });
    studentIds = enrolments.map((e) => e.userId);
  } else if (targetType === "class") {
    const liveClass = await db.liveClass.findFirst({
      where: { id: targetId, tutorId: session.user.id },
      select: { id: true, title: true },
    });
    if (!liveClass) return NextResponse.json({ error: "Class not found or not yours" }, { status: 404 });
    broadcastLabel = broadcastLabel || `Broadcast: ${liveClass.title ?? "Class"}`;

    // Get admitted / enrolled students for this class
    const course = await db.liveClass.findUnique({
      where: { id: targetId },
      select: { courseId: true },
    });
    if (!course) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const enrolments = await db.enrolment.findMany({
      where: {
        courseId: course.courseId,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID"] },
        user: { role: "STUDENT" },
      },
      select: { userId: true },
    });
    studentIds = enrolments.map((e) => e.userId);
  } else if (targetType === "group") {
    const group = await db.classGroup.findFirst({
      where: { id: targetId },
      select: { id: true, name: true },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    broadcastLabel = broadcastLabel || `Broadcast: ${group.name}`;

    const members = await db.classGroupMember.findMany({
      where: { groupId: targetId, user: { role: "STUDENT" } },
      select: { userId: true },
    });
    studentIds = members.map((m) => m.userId);
  }

  if (studentIds.length === 0) {
    return NextResponse.json({ error: "No students found in the target" }, { status: 400 });
  }

  // Record rate limit
  await recordFailure({ key: `broadcast:${session.user.id}`, windowSeconds: 600 });

  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Create individual conversations + messages for each student
  let sent = 0;
  for (const studentId of studentIds) {
    // Find or create conversation
    let conversationId: string;
    const existing = await db.conversationParticipant.findFirst({
      where: {
        userId: session.user.id,
        conversation: {
          participants: { some: { userId: studentId } },
        },
      },
      select: { conversationId: true },
    });

    if (existing) {
      conversationId = existing.conversationId;
      // Update label if set
      if (broadcastLabel) {
        await db.conversation.update({
          where: { id: conversationId },
          data: { broadcastLabel, updatedAt: new Date() },
        });
      }
    } else {
      const convo = await db.conversation.create({
        data: {
          broadcastLabel,
          participants: {
            create: [{ userId: session.user.id }, { userId: studentId }],
          },
        },
      });
      conversationId = convo.id;
    }

    await db.directMessage.create({
      data: { conversationId, senderId: session.user.id, body: safeBody },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // In-app notification
    await db.notification.create({
      data: {
        userId: studentId,
        channel: "IN_APP",
        type: "NEW_MESSAGE",
        subject: "New message from your instructor",
        body: safeBody.slice(0, 200),
        metadata: {
          fromUserId: session.user.id,
          fromName: session.user.name,
          conversationId,
          broadcastLabel,
        },
      },
    });

    sent++;
  }

  return NextResponse.json({ sent, broadcastLabel }, { status: 201 });
}
