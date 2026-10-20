import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const AcceptSchema = z.object({
  token: z.string().length(64),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
});

/** POST /api/admin/staff-invite/accept - accept invite, create account */
export async function POST(req: NextRequest) {
  const parsed = AcceptSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { token, name, password } = parsed.data;

  const invite = await db.staffInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired. Ask your administrator to send a new invite." }, { status: 410 });

  // Double-check email not already taken
  const existing = await db.user.findUnique({ where: { email: invite.email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email: invite.email,
      passwordHash,
      role: invite.role,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const [assignment] = await db.$queryRaw<Array<{ courseId: string | null }>>`
    SELECT "courseId" FROM staff_invites WHERE id = ${invite.id}
  `;
  if (assignment?.courseId) {
    await db.coTutor.upsert({
      where: { courseId_tutorId: { courseId: assignment.courseId, tutorId: user.id } },
      create: { courseId: assignment.courseId, tutorId: user.id },
      update: {},
    });
  }

  // Mark invite used
  await db.staffInvite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  await audit({
    actorId: user.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    metadata: { role: invite.role, via: "staff_invite" },
  });

  return NextResponse.json({ ok: true, role: user.role }, { status: 201 });
}
