/**
 * Full NextAuth config — Node.js runtime only.
 * Used by server components and API route handlers.
 * Never import this file from middleware.ts.
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { verifyTotp, decryptSecret } from "@/lib/totp";
import { authConfig } from "./auth.config";
import type { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(db),

  providers: [
    // ── Email / Password ─────────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Email / Phone",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password:   { label: "Password",       type: "password" },
        totpCode:   { label: "2FA Code",       type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier as string;
        const password   = credentials.password   as string;
        const totpCode   = (credentials.totpCode as string | undefined)?.replace(/\s/g, "") ?? "";

        const user = await db.user.findFirst({
          where: { OR: [{ email: identifier }, { phone: identifier }] },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED")  return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // ── TOTP enforcement ─────────────────────────────────────────
        // Any user with totpEnabled=true must supply a valid code.
        // SUPERADMIN accounts that have NOT yet set up TOTP (totpEnabled=false)
        // are allowed through — this covers freshly-seeded demo accounts and
        // the brief window between account creation and /2fa-setup completion.
        // Once a SUPERADMIN enables TOTP it becomes mandatory on every login.
        if (user.totpEnabled && user.totpSecret) {
          if (!totpCode) return null;
          const secret = decryptSecret(user.totpSecret);
          const ok     = await verifyTotp(secret, totpCode);
          if (!ok) return null;
        }

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          totpEnabled: user.totpEnabled,
        };
      },
    }),

    // ── Phone OTP ────────────────────────────────────────────────────────
    CredentialsProvider({
      id: "otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone",    type: "text" },
        code:  { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const phone = credentials.phone as string;
        const code  = credentials.code  as string;

        const user = await db.user.findUnique({ where: { phone } });
        if (!user || user.status === "SUSPENDED") return null;

        // SUPERADMIN must use email + TOTP
        if (user.role === "SUPERADMIN") return null;

        const otp = await db.otpCode.findFirst({
          where: {
            userId:    user.id,
            code,
            purpose:   "LOGIN",
            usedAt:    null,
            expiresAt: { gt: new Date() },
          },
        });

        if (!otp) return null;

        await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

        if (!user.phoneVerified) {
          await db.user.update({
            where: { id: user.id },
            data:  { phoneVerified: new Date(), status: "ACTIVE" },
          });
        }

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          totpEnabled: user.totpEnabled,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    // Override jwt to also refresh role from DB on subsequent requests
    async jwt({ token, user }) {
      if (user) {
        token.id          = user.id;
        token.role        = (user as { role: UserRole }).role;
        token.totpEnabled = (user as { totpEnabled: boolean }).totpEnabled ?? false;
      }
      // Refresh role/status from DB on every non-sign-in token use
      if (token.id && !user) {
        const dbUser = await db.user.findUnique({
          where:  { id: token.id as string },
          select: { role: true, status: true, totpEnabled: true },
        });
        if (dbUser) {
          token.role        = dbUser.role;
          token.status      = dbUser.status;
          token.totpEnabled = dbUser.totpEnabled;
        }
      }
      return token;
    },
  },
});

// ── Extended Session type ────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id:          string;
      name:        string;
      email:       string;
      role:        UserRole;
      totpEnabled: boolean;
    };
  }
}
