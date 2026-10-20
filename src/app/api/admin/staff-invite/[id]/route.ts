import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { randomBytes } from "crypto";
import { z } from "zod";

const ActionSchema = z.object({ action: z.enum(["resend", "revoke"]) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ActionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const invite = await db.staffInvite.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, studentNumber: true, role: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been accepted." }, { status: 409 });

  try {
    requirePermission(session.user.role, invite.userId ? "students.create" : "staff.create.initiate");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  if (parsed.data.action === "revoke") {
    await db.staffInvite.update({ where: { id: invite.id }, data: { expiresAt: new Date() } });
    await audit({ actorId: session.user.id, action: "UPDATE", entityType: "StaffInvite", entityId: invite.id, metadata: { action: "revoked", email: invite.email } });
    return NextResponse.json({ ok: true, action: "revoked" });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.staffInvite.update({ where: { id: invite.id }, data: { token, expiresAt, createdAt: new Date() } });
  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${token}`;

  if (invite.userId && invite.user) {
    const application = await db.application.findFirst({
      where: { createdUserId: invite.userId },
      select: { course: { select: { title: true } } },
    });
    await sendEmail({
      to: invite.email,
      subject: "Your Musawo Training Center account is ready",
      template: "student-invite",
      variables: { name: invite.user.name, studentNumber: invite.user.studentNumber ?? "", courseName: application?.course?.title ?? "", inviteUrl },
    });
  } else {
    await sendEmail({
      to: invite.email,
      subject: "Your Musawo Training Center invite",
      template: "staff-invite",
      variables: { name: invite.email, role: invite.role, inviteUrl },
    });
  }

  await audit({ actorId: session.user.id, action: "UPDATE", entityType: "StaffInvite", entityId: invite.id, metadata: { action: "resent", email: invite.email } });
  return NextResponse.json({ ok: true, action: "resent", inviteUrl, expiresAt });
}
