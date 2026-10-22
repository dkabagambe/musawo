import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canManageAccountRecoveryTarget } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "invites.resend"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const invites = await db.staffInvite.findMany({
    where: { acceptedAt: null, userId: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
    take: 100,
  });
  return NextResponse.json({
    invites: invites.filter((invite) =>
      canManageAccountRecoveryTarget(invite.role),
    ),
  });
}
