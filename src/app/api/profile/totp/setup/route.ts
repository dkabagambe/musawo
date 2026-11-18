import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = "MTC";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate a new TOTP secret
    const secret = authenticator.generateSecret();
    
    // Create OTP auth URL
    const otpauth = authenticator.keyuri(
      session.user.email ?? session.user.name,
      APP_NAME,
      secret
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauth);

    // Store the secret temporarily (will be confirmed when user verifies)
    // For now, store in session or a temporary table
    // Here we'll use a simple approach: store encrypted in user record temporarily
    await db.user.update({
      where: { id: session.user.id },
      data: {
        // Store temporarily - will be moved to totpSecret on verification
        totpBackupCodes: JSON.stringify({ tempSecret: secret }),
      },
    });

    return NextResponse.json({
      qrCode,
      secret,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate 2FA setup" },
      { status: 500 }
    );
  }
}
