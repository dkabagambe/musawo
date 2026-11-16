/**
 * GET /api/profile/sessions
 *
 * Returns information about the current user's active sessions.
 *
 * This app uses JWT (stateless) sessions — there is no central session table.
 * We return the current session's metadata from the JWT token and a count of
 * active sessions from the audit log (logins in the last 30 days) so the
 * Director can see recent login activity.
 *
 * The "sessions" array always contains exactly one entry: the current session,
 * marked as isCurrent=true.  The UI shows recent login entries from the audit
 * log alongside it for visibility.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Recent login entries from the audit log (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLogins = await db.auditLog.findMany({
    where: { actorId: session.user.id, action: "LOGIN", createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, ip: true, createdAt: true },
  });

  // Current session represented as a single entry
  const currentSession = {
    id: "current",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // JWT maxAge = 30 days
    isCurrent: true,
    ip: null as string | null,
    createdAt: null as string | null,
  };

  // Most recent login gives us the IP
  if (recentLogins[0]) {
    currentSession.ip = recentLogins[0].ip;
    currentSession.createdAt = recentLogins[0].createdAt.toISOString();
  }

  return NextResponse.json({
    sessions: [currentSession],
    recentLogins: recentLogins.map((l) => ({
      id: l.id,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
    note: "JWT sessions are stateless. Sign out of this device to end your session.",
  });
}
