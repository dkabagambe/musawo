/**
 * POST /api/director/reset-2fa
 *
 * Director-only endpoint to reset another user's TOTP (2FA) setup.
 * The Director can reset any staff member's 2FA, including the Principal.
 * After reset, the target user must re-complete 2FA setup on next login
 * (if TOTP enforcement is on for their role).
 *
 * Body: { userId: string }
 *
 * Audit logged as TOTP_RESET. A notification is sent to the target user.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "staff.create.approve")) {
    return NextResponse.json({ error: "Forbidden: Director access required" }, { status: 403 });
  }

  let userId: string;
  try {
    const body = await req.json() as { userId?: string };
    userId = (body.userId ?? "").trim();
    if (!userId) throw new Error("userId required");
  } catch {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Director cannot reset their own 2FA via this endpoint (prevents lockout)
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Use the profile settings to manage your own 2FA" }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, totpEnabled: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!target.totpEnabled) {
    return NextResponse.json({ error: "This account does not have 2FA enabled" }, { status: 400 });
  }

  // Clear TOTP fields
  await db.user.update({
    where: { id: target.id },
    data: {
      totpSecret:      null,
      totpEnabled:     false,
      totpVerifiedAt:  null,
      totpBackupCodes: null,
    },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;

  await audit({
    actorId:    session.user.id,
    action:     "TOTP_RESET",
    entityType: "User",
    entityId:   target.id,
    metadata:   {
      resetBy:    session.user.id,
      targetRole: target.role,
      targetEmail: target.email,
      reason:     "Director-initiated 2FA reset",
    },
    ip,
  });

  // Notify the affected user
  try {
    await db.notification.create({
      data: {
        userId:  target.id,
        subject: "Two-factor authentication reset",
        body:    `Your 2FA (two-factor authentication) was reset by the Director. You will be required to set it up again on your next login.`,
        type:    "SYSTEM",
        readAt:  null,
      },
    });
  } catch {
    // Non-fatal: notification failure should not block the reset
  }

  return NextResponse.json({
    ok:      true,
    message: `2FA has been reset for ${target.name ?? target.email}. They will need to set it up again on next login.`,
  });
}
