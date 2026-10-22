import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";
import type { UserRole } from "@prisma/client";
import { can } from "@/lib/rbac";

// Elevated oversight and SUPER_ADMIN roles require the dedicated approval flow.
const INVITABLE_ROLES: UserRole[] = [
  "HR_MANAGER",
  "ADMINISTRATOR",
  "PRINCIPAL",
  "DEPUTY_PRINCIPAL",
  "ACADEMIC_REGISTRAR",
  "INSTRUCTOR",
  "TEACHING_ASSISTANT",
  "FINANCE_OFFICER",
  "SYSTEM_IT",
];

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "HR_MANAGER",
    "ADMINISTRATOR",
    "PRINCIPAL",
    "DEPUTY_PRINCIPAL",
    "ACADEMIC_REGISTRAR",
    "INSTRUCTOR",
    "TEACHING_ASSISTANT",
    "FINANCE_OFFICER",
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
  courseId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (courseId && (!can(role, "courses.view") || can(role, "courses.create"))) {
    return {
      ok: false,
      error: "Only assigned teaching staff can be linked to a course.",
    };
  }
  if (
    courseId &&
    !(await db.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    }))
  ) {
    return { ok: false, error: "Course not found." };
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: `User already exists: ${email}` };

  await db.staffInvite.deleteMany({ where: { email, acceptedAt: null } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await db.staffInvite.create({
    data: { email, role, token, expiresAt, createdById: initiatorId },
  });
  if (courseId) {
    await db.$executeRaw`UPDATE staff_invites SET "courseId" = ${courseId} WHERE id = ${invite.id}`;
  }

  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const acceptUrl = `${siteUrl}/invite/${token}`;

  await sendEmail({
    to: email,
    subject: "You have been invited to Musawo Training Center",
    template: "staff-invite",
    variables: { name: email, role, inviteUrl: acceptUrl },
  });

  await audit({
    actorId: initiatorId,
    action: "CREATE",
    entityType: "StaffInvite",
    entityId: invite.id,
    metadata: { email, role, courseId },
  });

  return { ok: true };
}

/** POST /api/admin/staff-invite - send one or many staff invite emails */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    requirePermission(session.user.role, "staff.create.initiate");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 403 },
      );
    throw e;
  }

  const body = (await req.json()) as unknown;

  // Support both single invite {email, role} and bulk {invites: [...]}
  const isBulk =
    typeof body === "object" && body !== null && "invites" in (body as object);

  let invites: Array<{ email: string; role: string; courseId?: string }>;
  if (isBulk) {
    const parsed = BulkInviteSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    invites = parsed.data.invites;
  } else {
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    invites = [parsed.data];
  }

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const invite of invites) {
    const targetRole = invite.role as UserRole;

    if (!INVITABLE_ROLES.includes(targetRole)) {
      results.push({
        email: invite.email,
        ok: false,
        error: `Cannot invite role: ${targetRole}`,
      });
      continue;
    }

    const result = await sendInvite(
      invite.email,
      targetRole,
      session.user.id,
      invite.courseId,
    );
    results.push({ email: invite.email, ...result });
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ results }, { status: allOk ? 201 : 207 });
}

/** GET /api/admin/staff-invite?token=xxx - validate an invite token (public) */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const invite = await db.staffInvite.findUnique({ where: { token } });
  if (!invite)
    return NextResponse.json(
      { error: "Invalid invite link." },
      { status: 404 },
    );
  if (invite.acceptedAt)
    return NextResponse.json(
      { error: "This invite has already been used." },
      { status: 410 },
    );
  if (invite.expiresAt < new Date())
    return NextResponse.json(
      { error: "This invite has expired." },
      { status: 410 },
    );

  return NextResponse.json({ email: invite.email, role: invite.role });
}
