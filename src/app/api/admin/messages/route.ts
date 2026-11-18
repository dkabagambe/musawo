import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const SendMessageSchema = z.object({
  recipientId: z.string().cuid(),
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "messages.send"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = SendMessageSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { recipientId, subject, body } = parsed.data;

  // Verify recipient exists and is active
  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, status: true, role: true },
  });

  if (!recipient || recipient.status !== "ACTIVE") {
    return NextResponse.json({ error: "Recipient not found or inactive" }, { status: 404 });
  }

  // Admin can message instructors and students only
  if (!["INSTRUCTOR", "STUDENT"].includes(recipient.role)) {
    return NextResponse.json(
      { error: "Admin can only message instructors and students" },
      { status: 403 }
    );
  }

  // Create notification
  await db.notification.create({
    data: {
      userId: recipientId,
      channel: "IN_APP",
      type: "DIRECT_MESSAGE",
      subject,
      body,
      metadata: {
        fromId: session.user.id,
        fromName: session.user.name,
      },
    },
  });

  // Audit log
  await audit({
    actorId: session.user.id,
    action: "SEND_MESSAGE",
    entityType: "Notification",
    entityId: recipientId,
    metadata: {
      recipientId,
      via: canVia(session.user.role, "messages.send"),
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true, message: "Message sent" }, { status: 201 });
}
