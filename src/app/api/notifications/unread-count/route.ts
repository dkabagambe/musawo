import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/unread-count
 * Returns the number of unread IN_APP notifications for the current user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ count: 0 });

  const count = await db.notification.count({
    where: {
      userId: session.user.id,
      channel: "IN_APP",
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
