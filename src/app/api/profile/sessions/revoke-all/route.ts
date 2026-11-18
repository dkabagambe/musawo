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
    // Delete all sessions for this user EXCEPT the current one
    const result = await db.session.deleteMany({
      where: {
        userId: session.user.id,
        NOT: {
          sessionToken: session.sessionToken,
        },
      },
    });

    // Audit log
    await audit({
      actorId: session.user.id,
      action: "REVOKE_ALL_SESSIONS",
      entityType: "Session",
      entityId: session.user.id,
      metadata: { count: result.count },
    });

    return NextResponse.json({ 
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Revoke all sessions error:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
