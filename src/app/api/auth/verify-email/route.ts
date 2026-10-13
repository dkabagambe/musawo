import { NextRequest, NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/auth/email-verify";

export const runtime = "nodejs";

/**
 * GET /api/auth/verify-email?token=xxx&email=xxx
 *
 * Validates the token and marks the user's email as verified.
 * Redirects to /login?verified=1 on success, or /login?verifyError=xxx on failure.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!token || !email) {
    return NextResponse.redirect(
      new URL("/login?verifyError=invalid", base)
    );
  }

  const userId = await consumeEmailVerificationToken(
    decodeURIComponent(email),
    token
  );

  if (!userId) {
    return NextResponse.redirect(
      new URL("/login?verifyError=expired", base)
    );
  }

  return NextResponse.redirect(
    new URL("/login?verified=1", base)
  );
}
