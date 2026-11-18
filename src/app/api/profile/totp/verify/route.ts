import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { authenticator } from "otplib";
import crypto from "crypto";
import argon2 from "argon2";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    // Get the temporary secret
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { totpBackupCodes: true },
    });

    if (!user?.totpBackupCodes) {
      return NextResponse.json(
        { error: "No 2FA setup in progress" },
        { status: 400 }
      );
    }

    const tempData = JSON.parse(user.totpBackupCodes);
    const tempSecret = tempData.tempSecret;

    if (!tempSecret) {
      return NextResponse.json(
        { error: "No 2FA setup in progress" },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: tempSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    // Generate 10 backup codes
    const backupCodes: string[] = [];
    const hashedBackupCodes: Array<{ hash: string; usedAt: string | null }> = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      backupCodes.push(code);
      const hash = await argon2.hash(code);
      hashedBackupCodes.push({ hash, usedAt: null });
    }

    // Enable 2FA with the verified secret
    await db.user.update({
      where: { id: session.user.id },
      data: {
        totpSecret: tempSecret, // Should be encrypted in production
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        totpBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes,
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
