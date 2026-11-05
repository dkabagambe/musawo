import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

/**
 * POST /api/messages/send
 * Director or Principal sends a direct message (notification) to a specific user.
 * Requires the `messaging.send` permission.
 */
const SendSchema = z.object({
  recipientId: z.string().cuid(),
  subject:     z.string().min(1).max(160),
  body:        z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { requirePermission(session.user.role, "messaging.send"); }
  catch (error) { if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; }

  const parsed = SendSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });

  if (parsed.data.recipientId === session.user.id)
    return NextResponse.json({ error: "Cannot send a message to yourself" }, { status: 400 });

  const recipient = await db.user.findUnique({
    where: { id: parsed.data.recipientId },
    select: { id: true, name: true, status: true },
  });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  if (recipient.status !== "ACTIVE")
    return NextResponse.json({ error: "Recipient account is not active" }, { status: 400 });

  const notification = await db.notification.create({
    data: {
      userId:    recipient.id,
      channel:   "IN_APP",
      type:      "DIRECT_MESSAGE",
      subject:   parsed.data.subject,
      body:      parsed.data.body,
      metadata:  { fromUserId: session.user.id, fromName: session.user.name },
    },
  });

  await audit({
    actorId:    session.user.id,
    action:     "OPERATIONAL_NOTICE_SENT",
    entityType: "Notification",
    entityId:   notification.id,
    metadata:   {
      recipientId:   recipient.id,
      recipientName: recipient.name,
      subject:       parsed.data.subject,
      body:          parsed.data.body,
    },
  });

  return NextResponse.json({ notification, recipientName: recipient.name }, { status: 201 });
}
