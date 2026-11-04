import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

/**
 * POST /api/notifications/mark-all-read
 * Marks every unread notification for the current user as read.
 * Alias for /api/notifications/mark-read — kept so tutor and director
 * "Mark all read" forms work correctly.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
