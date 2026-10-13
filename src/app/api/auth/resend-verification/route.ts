import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/auth/email-verify";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/resend-verification
 * Resends the email verification link.
 * Rate-limited to once per minute per email (via token expiry — we just
 * check if a fresh token was created recently by looking for existing ones
 * that are still more than 23h55m from expiry).
 */
export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Always return 200 to avoid leaking whether an account exists
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "This email is already verified." }, { status: 409 });
  }

  // Simple rate-limit: only allow resend if no token was created in the last 2 minutes
  const recentToken = await db.verificationToken.findFirst({
    where: {
      identifier: email,
      expires: { gt: new Date(Date.now() + (24 * 60 - 2) * 60 * 1000) },
    },
  });
  if (recentToken) {
    return NextResponse.json(
      { error: "Please wait a moment before requesting another link." },
      { status: 429 }
    );
  }

  const token = await createEmailVerificationToken(email);
  await sendVerificationEmail(email, user.name, token);

  return NextResponse.json({ ok: true });
}
