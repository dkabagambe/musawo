/**
 * GET  /api/principal/delegation         - list current delegations (PRINCIPAL or SUPER_ADMIN)
 * POST /api/principal/delegation         - grant a delegation (PRINCIPAL or SUPER_ADMIN)
 * DELETE /api/principal/delegation/[perm] - revoke a delegation (PRINCIPAL or SUPER_ADMIN)
 *
 * Delegation allows the Deputy Principal to perform specific actions that
 * normally require the Principal.  Each delegation has an expiry datetime.
 *
 * Delegatable permissions (spec):
 *   exams.release, graduands.approve, certificates.issue, courses.publish,
 *   marks.change.approve
 *
 * Site setting key format: "delegation.<permission>"
 * Value: ISO-8601 expiry datetime (empty string or past date = revoked/expired)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, DELEGATABLE_TO_DEPUTY, type Permission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

function canManageDelegation(role: string) {
  return role === "PRINCIPAL" || role === "SUPER_ADMIN" || role === "SUPERADMIN";
}

/** GET: return current delegations and their expiry */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canManageDelegation(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.siteSetting.findMany({
    where: { key: { startsWith: "delegation." } },
    select: { key: true, value: true, updatedAt: true },
  });

  const now = new Date();
  const delegations = DELEGATABLE_TO_DEPUTY.map((permission) => {
    const row = rows.find((r) => r.key === `delegation.${permission}`);
    const expiry = row?.value ? new Date(row.value) : null;
    return {
      permission,
      active:    expiry ? expiry > now : false,
      expiresAt: row?.value ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ delegations });
}

const GrantSchema = z.object({
  permission: z.enum(DELEGATABLE_TO_DEPUTY as [Permission, ...Permission[]]),
  expiresAt:  z.string().datetime(),   // ISO-8601
});

/** POST: grant a delegation */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canManageDelegation(session.user.role)) {
    return NextResponse.json({ error: "Forbidden: only the Principal or Super Admin may delegate." }, { status: 403 });
  }

  const parsed = GrantSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { permission, expiresAt } = parsed.data;

  // Must expire in the future
  if (new Date(expiresAt) <= new Date()) {
    return NextResponse.json({ error: "Expiry must be in the future." }, { status: 422 });
  }

  const key = `delegation.${permission}`;

  await db.siteSetting.upsert({
    where:  { key },
    update: { value: expiresAt, updatedById: session.user.id },
    create: { key, value: expiresAt, description: `Delegation of ${permission} to Deputy Principal`, updatedById: session.user.id },
  });

  await audit({
    actorId:    session.user.id,
    action:     "DELEGATION_GRANTED",
    entityType: "SiteSetting",
    entityId:   key,
    metadata:   { permission, expiresAt },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ key, permission, expiresAt }, { status: 201 });
}

const RevokeSchema = z.object({
  permission: z.enum(DELEGATABLE_TO_DEPUTY as [Permission, ...Permission[]]),
});

/** DELETE: revoke a delegation immediately */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canManageDelegation(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = RevokeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const key = `delegation.${parsed.data.permission}`;

  // Set to a past date to revoke
  await db.siteSetting.upsert({
    where:  { key },
    update: { value: new Date(0).toISOString(), updatedById: session.user.id },
    create: { key, value: new Date(0).toISOString(), description: `Delegation of ${parsed.data.permission} to Deputy Principal`, updatedById: session.user.id },
  });

  await audit({
    actorId:    session.user.id,
    action:     "DELEGATION_REVOKED",
    entityType: "SiteSetting",
    entityId:   key,
    metadata:   { permission: parsed.data.permission },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ revoked: true });
}
