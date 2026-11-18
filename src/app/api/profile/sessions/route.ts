import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { headers } from "next/headers";

// Helper to parse user agent
function parseUserAgent(ua: string) {
  const browser = ua.includes("Chrome") ? "Chrome" 
    : ua.includes("Firefox") ? "Firefox"
    : ua.includes("Safari") ? "Safari"
    : ua.includes("Edge") ? "Edge"
    : "Unknown";

  const os = ua.includes("Windows") ? "Windows"
    : ua.includes("Mac") ? "macOS"
    : ua.includes("Linux") ? "Linux"
    : ua.includes("Android") ? "Android"
    : ua.includes("iOS") ? "iOS"
    : "Unknown";

  const device = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")
    ? "Mobile"
    : "Desktop";

  return { browser, os, device };
}

// GET: List all active sessions
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all sessions for this user from the database
    const sessions = await db.session.findMany({
      where: {
        userId: session.user.id,
        expires: { gt: new Date() }, // Only active (not expired)
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sessionToken: true,
        createdAt: true,
        expires: true,
        // These fields might not exist, so we'll add them or use metadata
      },
    });

    // Get current session token from cookie
    const headersList = headers();
    const currentSessionToken = session.sessionToken;

    const formattedSessions = await Promise.all(
      sessions.map(async (s) => {
        // Try to get additional metadata if stored
        // For now, use placeholder data
        const userAgent = ""; // Would come from session metadata
        const { browser, os, device } = parseUserAgent(userAgent || "Unknown");
        
        return {
          id: s.id,
          device,
          browser,
          os,
          ip: "Hidden", // IP not stored in session table
          location: null,
          isCurrent: s.sessionToken === currentSessionToken,
          lastActive: s.expires.toISOString(), // Use expires as proxy
          createdAt: s.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      sessions: formattedSessions,
    });
  } catch (error) {
    console.error("Sessions list error:", error);
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 }
    );
  }
}

// DELETE: Revoke a specific session
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const targetSession = await db.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, sessionToken: true },
    });

    if (!targetSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (targetSession.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cannot revoke another user's session" },
        { status: 403 }
      );
    }

    // Don't allow revoking current session
    if (targetSession.sessionToken === session.sessionToken) {
      return NextResponse.json(
        { error: "Cannot revoke your current session" },
        { status: 400 }
      );
    }

    // Delete the session
    await db.session.delete({
      where: { id: sessionId },
    });

    // Audit log
    await audit({
      actorId: session.user.id,
      action: "REVOKE_SESSION",
      entityType: "Session",
      entityId: sessionId,
      metadata: { target: "single" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session revoke error:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
