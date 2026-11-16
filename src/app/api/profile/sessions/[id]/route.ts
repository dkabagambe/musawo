/**
 * DELETE /api/profile/sessions/[id]
 *
 * With JWT sessions, there is no server-side session store to delete from.
 * This endpoint returns a 400 with a clear explanation so the UI can direct
 * the user to the sign-out button instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params: _ }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // JWT sessions cannot be individually revoked server-side
  return NextResponse.json(
    {
      error: "JWT sessions cannot be revoked remotely. Use the sign-out button on this device to end your session.",
      code: "JWT_SESSION",
    },
    { status: 400 },
  );
}
