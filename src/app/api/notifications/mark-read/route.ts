import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // If a specific notification id is provided, mark only that one.
  // Otherwise mark all (legacy behaviour).
  let id: string | undefined;
  try {
    const body = await req.json() as { id?: string };
    id = body.id;
  } catch {
    // no body — mark all
  }

  if (id) {
    // Verify ownership
    const notif = await db.notification.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.notification.update({ where: { id }, data: { readAt: new Date() } });
    return NextResponse.json({ updated: 1 });
  }

  const result = await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ updated: result.count });
}
