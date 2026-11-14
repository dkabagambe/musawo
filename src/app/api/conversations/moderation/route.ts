import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations/moderation
 * Principal safeguarding view: list all conversations with participants and last message.
 * Creates an audit log entry on every view.
 * Requires: messaging.send permission (Principal, Director).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "messaging.send")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = 50;
  const skip = (page - 1) * limit;

  const conversations = await db.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    skip,
    take: limit,
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const total = await db.conversation.count();

  // Audit log: record every moderation view for safeguarding
  await audit({
    actorId: session.user.id,
    action: "MESSAGE_MODERATION_VIEW",
    entityType: "Conversation",
    entityId: "all",
    metadata: { page, totalConversations: total },
  });

  return NextResponse.json({ conversations, total, page, limit });
}
