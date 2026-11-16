/**
 * DELETE /api/profile/sessions/[id]
 *
 * Signs out a specific session belonging to the authenticated user.
 * The user cannot revoke their current session through this endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const dbSession = await db.session.findUnique({
    where: { id },
    select: { id: true, userId: true, sessionToken: true },
  });

  if (!dbSession || dbSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Prevent revoking the current session through this endpoint
  const cookieStore = cookies();
  const tokenCookie =
    cookieStore.get("next-auth.session-token") ??
    cookieStore.get("__Secure-next-auth.session-token");
  if (tokenCookie?.value && dbSession.sessionToken === tokenCookie.value) {
    return NextResponse.json(
      { error: "Use the sign-out button to end your current session." },
      { status: 400 },
    );
  }

  await db.session.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
