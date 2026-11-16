/**
 * POST /api/director/reauth
 *
 * Director-only: verifies a fresh TOTP code or backup code and updates
 * `totpVerifiedAt` on the user record.  Used by the re-auth flow before
 * high-risk actions (payment approvals above threshold, role assignments,
 * fee changes, refunds).
 *
 * Body: { code: string }   -- 6-digit TOTP or 8-char backup code
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "approvals.decide")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { code?: string };
  const rawCode = (body.code ?? "").replace(/\s/g, "");
  if (!rawCode) return NextResponse.json({ error: "Code is required." }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, totpEnabled: true, totpSecret: true, totpBackupCodes: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA is not enabled on this account." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;

  // Try TOTP code first (6 digits)
  const { decryptSecret, verifyTotp } = await import("@/lib/totp");
  const secret = decryptSecret(user.totpSecret);
  const totpOk = await verifyTotp(secret, rawCode);

  if (totpOk) {
    await db.user.update({ where: { id: user.id }, data: { totpVerifiedAt: new Date() } });
    await audit({
      actorId:    user.id,
      action:     "TOTP_ENABLED", // reuse as TOTP_VERIFY not in enum; closest semantic match
      entityType: "User",
      entityId:   user.id,
      metadata:   { event: "REAUTH", method: "TOTP" },
      ip,
    });
    return NextResponse.json({ ok: true });
  }

  // Try backup code (8 chars)
  if (user.totpBackupCodes && rawCode.length === 8) {
    const { redeemBackupCode } = await import("@/lib/totp/backup-codes");
    const { redeemed, updatedEncryptedJson } = await redeemBackupCode(user.totpBackupCodes, rawCode);
    if (redeemed) {
      await db.user.update({
        where: { id: user.id },
        data: {
          totpVerifiedAt:  new Date(),
          totpBackupCodes: updatedEncryptedJson,
        },
      });
      await audit({
        actorId:    user.id,
        action:     "TOTP_BACKUP_USED",
        entityType: "User",
        entityId:   user.id,
        metadata:   { event: "REAUTH" },
        ip,
      });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
}
