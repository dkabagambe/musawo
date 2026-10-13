/**
 * Email verification token helpers.
 *
 * Uses the existing VerificationToken table (Auth.js standard table).
 * identifier = user email
 * token      = random hex (64 chars)
 * expires    = 24 hours from creation
 *
 * In development with no RESEND_API_KEY, the full verification URL
 * is printed to the terminal so developers can click it directly.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const TOKEN_TTL_HOURS = 24;

export async function createEmailVerificationToken(email: string): Promise<string> {
  // Expire any existing tokens for this email
  await db.verificationToken.deleteMany({ where: { identifier: email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.verificationToken.create({ data: { identifier: email, token, expires } });

  return token;
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${base}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  // In development without a real Resend key, print the link to the terminal
  // so developers can click it without needing email delivery.
  if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === "development") {
    console.log("\n─────────────────────────────────────────────────────");
    console.log("📧  EMAIL VERIFICATION LINK (dev only — click to verify)");
    console.log(verifyUrl);
    console.log("─────────────────────────────────────────────────────\n");
  }

  await sendEmail({
    to: email,
    subject: "Verify your email — Musawo Training Center",
    template: "email-verification",
    variables: {
      name,
      verifyUrl,
      expiresIn: `${TOKEN_TTL_HOURS} hours`,
    },
  });
}

/**
 * Validates the token and marks the user's email as verified.
 * Returns the user's id on success, null on failure.
 */
export async function consumeEmailVerificationToken(
  email: string,
  token: string
): Promise<string | null> {
  const record = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });

  if (!record) return null;
  if (record.expires < new Date()) {
    await db.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });
    return null;
  }

  // Mark email verified on the user
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  // Delete the used token
  await db.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return user.id;
}
