import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

export const runtime = "nodejs";

const AcceptSchema = z.object({
  token:    z.string().length(64),
  action:   z.enum(["accept", "dispute"]),
  password: z.string().min(8).max(128).optional(),
  reason:   z.string().min(5).max(1000).optional(),
});

/**
 * POST /api/student/accept-invite
 *
 * Two actions:
 *   accept  - student sets password, account becomes ACTIVE
 *   dispute - student flags details as wrong, account becomes DETAILS_DISPUTED,
 *             Registrar is notified by email
 */
export async function POST(req: NextRequest) {
  const parsed = AcceptSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { token, action, password, reason } = parsed.data;

  const invite = await db.staffInvite.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, phone: true,
          studentNumber: true, status: true, role: true,
        },
      },
    },
  });

  if (!invite)
    return NextResponse.json({ error: "Invalid or expired invitation link." }, { status: 404 });
  if (invite.acceptedAt)
    return NextResponse.json({ error: "This invitation link has already been used." }, { status: 410 });
  if (invite.expiresAt < new Date())
    return NextResponse.json({ error: "This invitation link has expired. Contact the Registrar to send a new one." }, { status: 410 });
  if (!invite.userId || !invite.user)
    return NextResponse.json({ error: "This is a staff invite. Use the staff acceptance flow." }, { status: 400 });

  const student = invite.user;
  if (student.role !== "STUDENT")
    return NextResponse.json({ error: "Unexpected invite type." }, { status: 400 });
  if (student.status === "ACTIVE")
    return NextResponse.json({ error: "Your account is already active. Please log in." }, { status: 409 });

  // ── Accept ───────────────────────────────────────────────────────
  if (action === "accept") {
    if (!password)
      return NextResponse.json({ error: "Password is required." }, { status: 400 });

    const passwordHash = await hashPassword(password);

    await db.user.update({
      where: { id: student.id },
      data: {
        passwordHash,
        status:       "ACTIVE",
        emailVerified: student.email ? new Date() : undefined,
        dataConsentAt: new Date(),
      },
    });

    // Mark invite consumed
    await db.staffInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    await audit({
      actorId:    student.id,
      action:     "UPDATE",
      entityType: "User",
      entityId:   student.id,
      metadata:   { event: "student_invite_accepted", studentNumber: student.studentNumber },
      ip:         req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  }

  // ── Dispute ──────────────────────────────────────────────────────
  if (!reason)
    return NextResponse.json({ error: "Dispute reason is required." }, { status: 400 });

  await db.user.update({
    where: { id: student.id },
    data: { status: "DETAILS_DISPUTED" },
  });

  // Mark invite consumed so they can't keep re-disputing on the same link
  await db.staffInvite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  await audit({
    actorId:    student.id,
    action:     "UPDATE",
    entityType: "User",
    entityId:   student.id,
    metadata:   { event: "student_details_disputed", reason, studentNumber: student.studentNumber },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Notify Registrar(s) by email
  try {
    const registrars = await db.user.findMany({
      where: { role: "ACADEMIC_REGISTRAR", status: "ACTIVE" },
      select: { email: true, name: true },
    });

    const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    for (const reg of registrars) {
      if (!reg.email) continue;
      await sendEmail({
        to:       reg.email,
        subject:  `Student details dispute - ${student.name}`,
        template: "student-details-disputed",
        variables: {
          studentName:   student.name,
          studentNumber: student.studentNumber ?? student.id,
          studentEmail:  student.email ?? student.phone ?? "Not provided",
          reason,
          registrarUrl:  `${siteUrl}/registrar/students`,
        },
      }).catch(() => { /* non-fatal */ });
    }
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ ok: true });
}
