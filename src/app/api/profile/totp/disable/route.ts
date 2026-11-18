import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user has 2FA enabled
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { totpEnabled: true, role: true },
    });

    if (!user?.totpEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    // In production, SYSTEM_IT, DIRECTOR, and PRINCIPAL cannot disable 2FA
    const isProduction = process.env.APP_ENV === "production";
    const requiresTOTP = ["SYSTEM_IT", "DIRECTOR", "PRINCIPAL"].includes(user.role);
    
    if (isProduction && requiresTOTP) {
      return NextResponse.json(
        { error: "2FA cannot be disabled for your role in production" },
        { status: 403 }
      );
    }

    // Disable 2FA
    await db.user.update({
      where: { id: session.user.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpVerifiedAt: null,
        totpBackupCodes: null,
      },
    });

    // Audit log
    await audit({
      actorId: session.user.id,
      action: "DISABLE_2FA",
      entityType: "User",
      entityId: session.user.id,
      metadata: { role: user.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
