import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Determine if the requesting user may message the target user. */
async function canMessage(
  actorId: string,
  actorRole: string,
  targetId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Director/Principal/Admin can message anyone
  if (["DIRECTOR", "PRINCIPAL", "ADMIN"].includes(actorRole)) {
    return { allowed: true };
  }

  // INSTRUCTOR: may only message students enrolled in their own courses
  if (actorRole === "INSTRUCTOR") {
    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) return { allowed: false, reason: "User not found" };
    if (target.role !== "STUDENT") return { allowed: false, reason: "Instructors may only message their own students" };

    // Check the student is enrolled in one of this instructor's courses
    const enrolled = await db.enrolment.findFirst({
      where: {
        userId: targetId,
        status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID"] },
        course: teachingCourseWhere(actorId),
      },
      select: { id: true },
    });
    if (!enrolled) return { allowed: false, reason: "Student is not enrolled in any of your courses" };
    return { allowed: true };
  }

  // STUDENT: may only message instructors of courses they are enrolled in, or Admin via Support
  if (actorRole === "STUDENT") {
    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) return { allowed: false, reason: "User not found" };

    if (target.role === "ADMIN" || target.role === "PRINCIPAL" || target.role === "DIRECTOR") {
      return { allowed: true };
    }

    if (target.role === "INSTRUCTOR") {
      // Must share at least one enrolment
      const sharedCourse = await db.enrolment.findFirst({
        where: {
          userId: actorId,
          status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID"] },
          course: teachingCourseWhere(targetId),
        },
        select: { id: true },
      });
      if (!sharedCourse) return { allowed: false, reason: "You may only message instructors from your own courses" };
      return { allowed: true };
    }

    // Students may not message other students
    return { allowed: false, reason: "Students may not message other students" };
  }

  return { allowed: false, reason: "Not permitted" };
}

/**
 * GET /api/conversations
 * List all conversations for the current user, with unread counts and last message.
 * Optional ?search= query param.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() ?? "";

  const participations = await db.conversationParticipant.findMany({
    where: { userId: session.user.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  avatarUrl: true,
                  studentNumber: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversations = participations
    .map((p) => {
      const other = p.conversation.participants.find((cp) => cp.userId !== session.user.id);
      const lastMsg = p.conversation.messages[0] ?? null;

      // Unread: messages after lastReadAt not sent by me
      const unread =
        lastMsg &&
        lastMsg.senderId !== session.user.id &&
        (!p.lastReadAt || lastMsg.createdAt > p.lastReadAt)
          ? 1
          : 0;

      return {
        id: p.conversation.id,
        broadcastLabel: p.conversation.broadcastLabel,
        updatedAt: p.conversation.updatedAt,
        otherUser: other?.user ?? null,
        lastMessage: lastMsg
          ? {
              body: lastMsg.body.slice(0, 120),
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt,
            }
          : null,
        unread,
      };
    })
    .filter((c) => {
      if (!search) return true;
      return c.otherUser?.name.toLowerCase().includes(search.toLowerCase());
    });

  return NextResponse.json({ conversations });
}

const StartSchema = z.object({
  recipientId: z.string().cuid("Invalid recipient ID"),
  initialMessage: z.string().min(1).max(2000).optional(),
});

/**
 * POST /api/conversations
 * Start (or return existing) conversation with a user.
 * Body: { recipientId, initialMessage? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "messaging.students.own") && !can(session.user.role, "messaging.send")) {
    return NextResponse.json({ error: "Not permitted to send messages" }, { status: 403 });
  }

  const parsed = StartSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });

  const { recipientId, initialMessage } = parsed.data;
  if (recipientId === session.user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  // Permission check
  const { allowed, reason } = await canMessage(session.user.id, session.user.role, recipientId);
  if (!allowed) return NextResponse.json({ error: reason ?? "Not permitted" }, { status: 403 });

  // Check if conversation already exists between these two users
  const existing = await db.conversationParticipant.findFirst({
    where: {
      userId: session.user.id,
      conversation: {
        participants: { some: { userId: recipientId } },
      },
    },
    select: { conversationId: true },
  });

  let conversationId: string;
  if (existing) {
    conversationId = existing.conversationId;
  } else {
    const convo = await db.conversation.create({
      data: {
        participants: {
          create: [{ userId: session.user.id }, { userId: recipientId }],
        },
      },
    });
    conversationId = convo.id;
  }

  // Send initial message if provided
  if (initialMessage?.trim()) {
    await db.directMessage.create({
      data: {
        conversationId,
        senderId: session.user.id,
        body: initialMessage.trim(),
      },
    });
    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Create in-app notification for recipient
    await db.notification.create({
      data: {
        userId: recipientId,
        channel: "IN_APP",
        type: "NEW_MESSAGE",
        subject: "New message",
        body: initialMessage.trim().slice(0, 200),
        metadata: {
          fromUserId: session.user.id,
          fromName: session.user.name,
          conversationId,
        },
      },
    });

    // Email notification (throttled: 1 per conversation per 15 min)
    void sendMessageEmailThrottled(conversationId, recipientId, session.user.id, session.user.name ?? "Your instructor", initialMessage.trim());
  }

  return NextResponse.json({ conversationId }, { status: 201 });
}

/** Send email notification for a new message, throttled to 1 per 15 min per conversation per recipient. */
async function sendMessageEmailThrottled(
  conversationId: string,
  recipientId: string,
  senderId: string,
  senderName: string,
  _body: string,
) {
  try {
    const throttleWindow = 15 * 60 * 1000; // 15 minutes
    const existing = await db.messageEmailThrottle.findUnique({
      where: { conversationId_recipientId: { conversationId, recipientId } },
    });
    if (existing && Date.now() - existing.sentAt.getTime() < throttleWindow) {
      return; // throttled
    }

    const recipient = await db.user.findUnique({
      where: { id: recipientId },
      select: { email: true, name: true },
    });
    if (!recipient?.email) return;

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: recipient.email,
      subject: `New message from ${senderName}`,
      template: "plain",
      variables: {
        name: recipient.name,
        body: `You have a new message from ${senderName}.\n\nLog in to Musawo Training Center to read and reply:\n${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.musawo.ug"}/dashboard/messages`,
      },
    });

    // Upsert throttle record
    await db.messageEmailThrottle.upsert({
      where: { conversationId_recipientId: { conversationId, recipientId } },
      update: { sentAt: new Date() },
      create: { conversationId, recipientId, sentAt: new Date() },
    });
  } catch (err) {
    // Non-critical: log and continue
    console.error("[messaging] Email notification error:", err);
  }
}
