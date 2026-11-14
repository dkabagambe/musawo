import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { checkRateLimit, recordFailure } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Verify user is a participant of this conversation. */
async function requireParticipant(conversationId: string, userId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return participant;
}

/**
 * GET /api/conversations/[id]/messages
 * Returns messages for a conversation (most recent first, paginated).
 * Also marks messages as read.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await requireParticipant(params.id, session.user.id);
  if (!participant) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const messages = await db.directMessage.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Mark as read: set lastReadAt to now
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ messages });
}

const SendSchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(2000, "Message too long (max 2000 characters)"),
});

/**
 * POST /api/conversations/[id]/messages
 * Send a message in a conversation.
 * Rate limited: 20 messages per 60 seconds per user.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 20 messages per minute
  const rl = await checkRateLimit({
    key: `msg:send:${session.user.id}`,
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "You are sending messages too quickly. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.resetIn) } },
    );
  }

  const participant = await requireParticipant(params.id, session.user.id);
  if (!participant) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const parsed = SendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid message" }, { status: 400 });
  }

  const body = parsed.data.body.trim();
  // HTML-escape the body before storing
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const message = await db.directMessage.create({
    data: {
      conversationId: params.id,
      senderId: session.user.id,
      body: safeBody,
    },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });

  // Update conversation timestamp for ordering
  await db.conversation.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  // Mark sender's lastReadAt so their own message doesn't show as unread
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  });

  // Record rate-limit entry for this send
  await recordFailure({ key: `msg:send:${session.user.id}`, windowSeconds: 60 });

  // Create in-app notification for the other participant(s)
  const others = await db.conversationParticipant.findMany({
    where: { conversationId: params.id, userId: { not: session.user.id } },
    select: { userId: true },
  });

  for (const other of others) {
    await db.notification.create({
      data: {
        userId: other.userId,
        channel: "IN_APP",
        type: "NEW_MESSAGE",
        subject: "New message",
        body: safeBody.slice(0, 200),
        metadata: {
          fromUserId: session.user.id,
          fromName: session.user.name,
          conversationId: params.id,
        },
      },
    });

    // Throttled email notification
    void sendMessageEmailThrottled(
      params.id,
      other.userId,
      session.user.id,
      session.user.name ?? "Musawo Training Center",
      safeBody,
    );
  }

  return NextResponse.json({ message }, { status: 201 });
}

async function sendMessageEmailThrottled(
  conversationId: string,
  recipientId: string,
  _senderId: string,
  senderName: string,
  _body: string,
) {
  try {
    const throttleWindow = 15 * 60 * 1000;
    const existing = await db.messageEmailThrottle.findUnique({
      where: { conversationId_recipientId: { conversationId, recipientId } },
    });
    if (existing && Date.now() - existing.sentAt.getTime() < throttleWindow) return;

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

    await db.messageEmailThrottle.upsert({
      where: { conversationId_recipientId: { conversationId, recipientId } },
      update: { sentAt: new Date() },
      create: { conversationId, recipientId, sentAt: new Date() },
    });
  } catch (err) {
    console.error("[messaging] Email error:", err);
  }
}
