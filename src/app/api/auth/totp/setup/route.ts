import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTotpSecret, generateQrDataUrl } from "@/lib/totp";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * GET  — generate a new TOTP secret and return QR code (only if not yet enabled)
 * POST — confirm setup with a valid code, then enable TOTP on the account
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true, email: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.totpEnabled) return NextResponse.json({ error: "TOTP already enabled" }, { status: 409 });

  const label = user.email ?? user.name;
  const { secret, otpauthUrl } = await generateTotpSecret(label);
  const qrDataUrl = await generateQrDataUrl(otpauthUrl);

  // Store the raw secret temporarily in a signed server-side value (we use a short-lived OTP record)
  // Store in OtpCode table with purpose TOTP_SETUP — reuse the pattern
  await db.otpCode.deleteMany({ where: { userId: session.user.id, purpose: "TOTP_SETUP" } });
  await db.otpCode.create({
    data: {
      userId:    session.user.id,
      code:      secret, // base32 secret (not a digit code here)
      purpose:   "TOTP_SETUP",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min to complete setup
    },
  });

  return NextResponse.json({ qrDataUrl, secret });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = (await req.json()) as { code: string };
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  // Retrieve the pending setup secret
  const pending = await db.otpCode.findFirst({
    where: {
      userId:    session.user.id,
      purpose:   "TOTP_SETUP",
      usedAt:    null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!pending) return NextResponse.json({ error: "No pending TOTP setup. Please start again." }, { status: 400 });

  const { verifyTotp, encryptSecret } = await import("@/lib/totp");
  const ok = await verifyTotp(pending.code, code.replace(/\s/g, ""));
  if (!ok) return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });

  const encrypted = encryptSecret(pending.code);

  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data:  { totpSecret: encrypted, totpEnabled: true, totpVerifiedAt: new Date() },
    }),
    db.otpCode.update({ where: { id: pending.id }, data: { usedAt: new Date() } }),
  ]);

  await audit({
    actorId:    session.user.id,
    action:     "TOTP_ENABLED",
    entityType: "User",
    entityId:   session.user.id,
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
