import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "invites.resend")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body as { action: "resend" | "revoke" };

    const student = await db.user.findUnique({
      where: { id: params.id, role: "STUDENT" },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (action === "resend") {
      // Generate new password reset token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.passwordResetToken.create({
        data: {
          userId: student.id,
          token,
          expiresAt: expires,
        },
      });

      // Send email (in production; for now just log)
      const setPasswordUrl = `${process.env.NEXTAUTH_URL}/set-password?token=${token}`;
      console.log(`[Resend invitation] ${student.email}: ${setPasswordUrl}`);

      // TODO: Send actual email via email service

      // Update student status to INVITED
      await db.user.update({
        where: { id: student.id },
        data: { status: "INVITED" },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          action: "INVITATION_RESEND",
          performedBy: session.user.id,
          targetUser: student.id,
          details: { reason: "Admin resent invitation" },
        },
      });

      return NextResponse.json({
        message: "Invitation resent. Previous link invalidated.",
      });
    }

    if (action === "revoke") {
      // Invalidate all password reset tokens for this user
      await db.passwordResetToken.deleteMany({
        where: { userId: student.id },
      });

      // Update status back to PENDING
      await db.user.update({
        where: { id: student.id },
        data: { status: "PENDING" },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          action: "INVITATION_REVOKE",
          performedBy: session.user.id,
          targetUser: student.id,
          details: { reason: "Admin revoked invitation" },
        },
      });

      return NextResponse.json({
        message: "Invitation revoked.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/invites/student/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
