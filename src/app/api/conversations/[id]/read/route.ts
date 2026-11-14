import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/read
 * Mark all messages in this conversation as read for the current user.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
