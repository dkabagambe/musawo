import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/director/reset-2fa
 * Director resets a staff member's 2FA (Principal or other staff).
 * The staff member must set up 2FA again on next login.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.create.approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  // Find the user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, totpEnabled: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cannot reset own 2FA or another Director's
  if (user.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot reset your own 2FA. Use profile settings." },
      { status: 400 }
    );
  }

  if (user.role === "DIRECTOR") {
    return NextResponse.json(
      { error: "Director accounts cannot have 2FA reset by another Director." },
      { status: 403 }
    );
  }

  if (!user.totpEnabled) {
    return NextResponse.json(
      { error: "This user does not have 2FA enabled." },
      { status: 400 }
    );
  }

  // Reset 2FA
  await db.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpEnabled: false,
      totpBackupCodes: null,
    },
  });

  // Audit log
  await audit({
    actorId: session.user.id,
    action: "TOTP_RESET",
    entityType: "User",
    entityId: userId,
    metadata: {
      targetUserName: user.name,
      targetUserEmail: user.email,
      targetUserRole: user.role,
      reason: "Director initiated reset",
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // TODO: Send notification email to the user
  // await sendEmail({
  //   to: user.email,
  //   subject: "Your 2FA has been reset",
  //   body: `Your two-factor authentication has been reset by the Director. You will need to set it up again on your next login.`,
  // });

  return NextResponse.json({
    ok: true,
    message: `2FA reset for ${user.name}. They will need to set it up again on next login.`,
  });
}
