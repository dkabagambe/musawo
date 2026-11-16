/**
 * GET /api/profile/sessions
 *
 * Returns all active sessions for the authenticated user.
 * Marks the current session so the UI can distinguish it.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the current session token from the Next-Auth cookie
  const cookieStore = cookies();
  const tokenCookie =
    cookieStore.get("next-auth.session-token") ??
    cookieStore.get("__Secure-next-auth.session-token");
  const currentToken = tokenCookie?.value ?? null;

  const dbSessions = await db.session.findMany({
    where: { userId: session.user.id, expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
    select: { id: true, sessionToken: true, expires: true },
  });

  const result = dbSessions.map((s) => ({
    id:        s.id,
    expires:   s.expires.toISOString(),
    isCurrent: currentToken ? s.sessionToken === currentToken : false,
  }));

  return NextResponse.json({ sessions: result });
}
