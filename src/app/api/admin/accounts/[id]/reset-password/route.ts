import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canVia, canManageAccountRecoveryTarget } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "password_reset.send")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target?.email)
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!canManageAccountRecoveryTarget(target.role)) {
    return NextResponse.json(
      { error: "This account requires its designated administrator." },
      { status: 403 },
    );
  }

  const recent = await db.otpCode.findFirst({
    where: {
      userId: target.id,
      purpose: "RESET",
      createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent)
    return NextResponse.json(
      { error: "A reset link was sent recently. Try again in five minutes." },
      { status: 429 },
    );

  await db.otpCode.updateMany({
    where: { userId: target.id, purpose: "RESET", usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await db.otpCode.create({
    data: {
      userId: target.id,
      code: token,
      purpose: "RESET",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
  await sendEmail({
    to: target.email,
    subject: "Reset your Musawo Training Center password",
    template: "password-reset",
    variables: { name: target.name, resetUrl },
  });
  await db.notification.create({
    data: {
      userId: target.id,
      channel: "IN_APP",
      type: "PASSWORD_RESET_SENT",
      subject: "Password reset link sent",
      body: "A password reset link was sent to your registered email address.",
    },
  });
  await audit({
    actorId: session.user.id,
    action: "ACCOUNT_RESET_SENT",
    entityType: "User",
    entityId: target.id,
    metadata: {
      targetRole: target.role,
      via: canVia(session.user.role, "password_reset.send"),
    },
    ip: _req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: _req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true, expiresInSeconds: 3600 });
}
