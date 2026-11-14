import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const announcement = await db.announcement.findUnique({
    where: { id: params.id },
    select: { id: true, authorId: true },
  });

  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the author or an admin/principal can delete
  const isAdmin = can(session.user.role, "announcements.send.all");
  if (announcement.authorId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.announcement.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
