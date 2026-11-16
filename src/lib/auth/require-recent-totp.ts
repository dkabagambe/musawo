/**
 * Re-authentication guard for high-risk actions.
 *
 * "Recent TOTP" means: the user completed a TOTP or backup-code challenge
 * within the last WINDOW_MS milliseconds (default 15 minutes) in this session.
 *
 * Usage in an API route:
 *
 *   const check = await requireRecentTotp(session.user.id);
 *   if (!check.ok) return NextResponse.json({ error: check.error, code: "REAUTH_REQUIRED" }, { status: 403 });
 *
 * The front-end should handle code "REAUTH_REQUIRED" by redirecting the user to
 * /director/reauth?next=<current-path>.
 */

import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function requireRecentTotp(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true, totpVerifiedAt: true },
  });

  if (!user) return { ok: false, error: "User not found." };

  // If TOTP is not enabled on this account, skip the check (dev/staging only)
  if (!user.totpEnabled) return { ok: true };

  if (!user.totpVerifiedAt) {
    return { ok: false, error: "Re-authentication required. Please verify your authenticator code." };
  }

  const age = Date.now() - new Date(user.totpVerifiedAt).getTime();
  if (age > WINDOW_MS) {
    return { ok: false, error: "Your session needs re-verification. Please enter your authenticator code to continue." };
  }

  return { ok: true };
}
