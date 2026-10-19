import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError, can } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";
import type { UserRole } from "@prisma/client";

// Roles that can be assigned via invite (never SUPERADMIN via invite)
const INVITABLE_ROLES: UserRole[] = [
  "ADMINISTRATOR",
  "PRINCIPAL",
  "ACADEMIC_REGISTRAR",
  "BURSAR",
  "TUTOR",
  "SYSTEM_IT",
];

// Additional restriction: ADMINISTRATOR can only invite TUTOR and ACADEMIC_REGISTRAR
const ADMINISTRATOR_INVITABLE: UserRole[] = ["TUTOR", "ACADEMIC_REGISTRAR"];

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "ADMINISTRATOR",
    "PRINCIPAL",
    "ACADEMIC_REGISTRAR",
    "BURSAR",
    "TUTOR",
    "SYSTEM_IT",
  ] as [string, ...string[]]),
  courseId: z.string().optional(), // assign to course immediately if provided
});

const BulkInviteSchema = z.object({
  invites: z.array(InviteSchema).min(1).max(50),
});

async function sendInvite(
  email: string,
  role: UserRole,
  initiatorId: string,
  courseId?: string
): Promise<{ ok: boolean; error?: string }> {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: `User already exists: ${email}` };

  await db.staffInvite.deleteMany({ where: { email, acceptedAt: null } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.staffInvite.create({
    data: { email, role, token, expiresAt, createdById: initiatorId },
  });

  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const acceptUrl = `${siteUrl}/invite/${token}`;

  await sendEmail({
    to: email,
    subject: "You have been invited to Musawo Training Center",
    template: "welcome",
    variables: { name: email, loginUrl: acceptUrl },
  });

  await audit({
    actorId: initiatorId,
    action: "CREATE",
    entityType: "StaffInvite",
    entityId: token,
    metadata: { email, role, courseId },
  });

  // If courseId provided and role is TUTOR, pre-assign as co-tutor
  if (courseId && role === "TUTOR") {
    // Pre-assignment happens when they accept the invite and their account is created
    // Store courseId in the invite metadata via a separate note - for now log it
  }

  return { ok: true };
}

/** POST /api/admin/staff-invite - send one or many staff invite emails */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { requirePermission(session.user.role, "staff.create.initiate"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    throw e;
  }

  const body = (await req.json()) as unknown;

  // Support both single invite {email, role} and bulk {invites: [...]}
  const isBulk = typeof body === "object" && body !== null && "invites" in (body as object);

  let invites: Array<{ email: string; role: string; courseId?: string }>;
  if (isBulk) {
    const parsed = BulkInviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    invites = parsed.data.invites;
  } else {
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    invites = [parsed.data];
  }

  const actorRole = session.user.role;
  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const invite of invites) {
    const targetRole = invite.role as UserRole;

    // ADMINISTRATOR can only invite TUTOR and ACADEMIC_REGISTRAR
    if (
      actorRole === "ADMINISTRATOR" &&
      !ADMINISTRATOR_INVITABLE.includes(targetRole)
    ) {
      results.push({ email: invite.email, ok: false, error: `ADMINISTRATOR cannot invite role: ${targetRole}` });
      continue;
    }

    // Non-SUPERADMIN cannot invite roles outside the invitable list
    if (
      actorRole !== "SUPERADMIN" &&
      !INVITABLE_ROLES.includes(targetRole)
    ) {
      results.push({ email: invite.email, ok: false, error: `Cannot invite role: ${targetRole}` });
      continue;
    }

    const result = await sendInvite(invite.email, targetRole, session.user.id, invite.courseId);
    results.push({ email: invite.email, ...result });
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ results }, { status: allOk ? 201 : 207 });
}

/** GET /api/admin/staff-invite?token=xxx - validate an invite token (public) */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const invite = await db.staffInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });

  return NextResponse.json({ email: invite.email, role: invite.role });
}
