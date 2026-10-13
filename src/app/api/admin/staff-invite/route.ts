import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["SYSTEM_IT", "REGISTRAR", "BURSAR", "TUTOR"]),
  // SUPERADMIN accounts are created only via seed/CLI — never via invite
});

/** POST /api/admin/staff-invite — send a staff invite email */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "staff.create.initiate"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 }); throw e; }

  const parsed = InviteSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { email, role } = parsed.data;

  // Check no active user with this email
  const existing = await db.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  // Expire any old pending invites for this email
  await db.staffInvite.deleteMany({ where: { email, acceptedAt: null } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await db.staffInvite.create({
    data: { email, role, token, expiresAt, createdById: session.user.id },
  });

  const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

  await sendEmail({
    to: email,
    subject: "You've been invited to Musawo Training Center staff portal",
    template: "welcome",
    variables: {
      name: email,
      loginUrl: acceptUrl,
      // Body text is handled by the email template
    },
  });

  await audit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "StaffInvite",
    entityId: token,
    metadata: { email, role },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, expiresAt }, { status: 201 });
}

/** GET /api/admin/staff-invite?token=xxx — validate an invite token (public) */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const invite = await db.staffInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });

  return NextResponse.json({ email: invite.email, role: invite.role });
}
