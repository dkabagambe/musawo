import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations/unread-count
 * Returns the number of conversations that have at least one unread message
 * for the current user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ count: 0 });

  const participants = await db.conversationParticipant.findMany({
    where: { userId: session.user.id },
    select: { conversationId: true, lastReadAt: true },
  });

  if (participants.length === 0) return NextResponse.json({ count: 0 });

  let unreadCount = 0;
  for (const p of participants) {
    const latestMsg = await db.directMessage.findFirst({
      where: {
        conversationId: p.conversationId,
        senderId: { not: session.user.id },
        createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
      },
      select: { id: true },
    });
    if (latestMsg) unreadCount++;
  }

  return NextResponse.json({ count: unreadCount });
}
