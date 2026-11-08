/**
 * Full NextAuth config - Node.js runtime only.
 * Used by server components and API route handlers.
 * Never import this file from middleware.ts.
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { authConfig } from "./auth.config";
import { checkLoginAllowed, recordLoginFailure, recordLoginSuccess } from "@/lib/auth/rate-limit";
import type { UserRole } from "@prisma/client";

/** Extract the client IP from request headers (works behind proxies). */
function getClientIp(): string {
  const fwd = headers().get("x-forwarded-for");
  const real = headers().get("x-real-ip");
  return (fwd?.split(",")[0].trim() || real || "unknown");
}

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

        const ip         = getClientIp();
        const identifier = credentials.identifier as string;
        const password   = credentials.password   as string;
        const totpCode   = (credentials.totpCode as string | undefined)?.replace(/\s/g, "") ?? "";

        // ── Rate limit: check BEFORE attempting (only failures are counted) ─
        const rlCheck = await checkLoginAllowed(identifier, ip);
        if (!rlCheck.allowed) return null; // silently fail; message is in rlCheck.message

        const user = await db.user.findFirst({
          where: { OR: [{ email: identifier }, { phone: identifier }] },
          select: {
            id: true, name: true, email: true, role: true,
            passwordHash: true, status: true,
            totpEnabled: true, totpSecret: true, totpBackupCodes: true,
          },
        });

        if (!user || !user.passwordHash) {
          // Record failure for the IP even when account doesn't exist (enumeration)
          await recordLoginFailure(identifier, ip);
          return null;
        }
        // Login is impossible before the account is accepted/active.
        // PENDING_VERIFICATION: email not confirmed (registration flow - not used for invite flow)
        // PENDING_ACCEPTANCE:   Registrar created the account; student has not confirmed details yet
        // DETAILS_DISPUTED:     student flagged details as wrong; must contact Registrar
        if (user.status === "SUSPENDED" ||
            user.status === "PENDING_ACCEPTANCE" ||
            user.status === "DETAILS_DISPUTED") return null; // do not count as failure

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await recordLoginFailure(identifier, ip);
          return null;
        }

        // ── TOTP enforcement ─────────────────────────────────────────
        // Any user with totpEnabled=true must supply a valid code.
        // Accepts either a 6-digit TOTP code or an 8-char backup code.
        if (user.totpEnabled && user.totpSecret) {
          if (!totpCode) return null;

          // Try TOTP code first
          const { decryptSecret: decrypt, verifyTotp: verify } = await import("@/lib/totp");
          const secret = decrypt(user.totpSecret);
          const totpOk = await verify(secret, totpCode);

          if (!totpOk) {
            // Try backup code (8 hex chars, case-insensitive)
            if (user.totpBackupCodes && totpCode.replace(/\s/g, "").length === 8) {
              const { redeemBackupCode } = await import("@/lib/totp/backup-codes");
              const { redeemed, updatedEncryptedJson } = await redeemBackupCode(
                user.totpBackupCodes,
                totpCode.replace(/\s/g, ""),
              );
              if (redeemed) {
                await import("@/lib/db").then(({ db: prisma }) =>
                  prisma.user.update({
                    where: { id: user.id },
                    data: { totpBackupCodes: updatedEncryptedJson },
                  })
                );
                // Audit backup code use
                try {
                  const { audit } = await import("@/lib/audit");
                  await audit({
                    actorId: user.id,
                    action: "TOTP_BACKUP_USED",
                    entityType: "User",
                    entityId: user.id,
                    ip,
                  });
                } catch { /* non-fatal */ }
              } else {
                await recordLoginFailure(identifier, ip);
                return null;
              }
            } else {
              await recordLoginFailure(identifier, ip);
              return null;
            }
          }
        }

        // ── Successful login: clear the per-account failure counter ────
        await recordLoginSuccess(identifier);

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

        // ── Rate limit: OTP failures per IP ───────────────────────────
        const ip = getClientIp();
        const rl = await checkLoginAllowed(`otp:${credentials.phone as string}`, ip);
        if (!rl.allowed) return null;

        const phone = credentials.phone as string;
        const code  = credentials.code  as string;

        const user = await db.user.findUnique({ where: { phone } });
        if (!user ||
            user.status === "SUSPENDED" ||
            user.status === "PENDING_ACCEPTANCE" ||
            user.status === "DETAILS_DISPUTED") return null;

        // DIRECTOR and PRINCIPAL must use email + password (OTP login not available)
        if (user.role === "DIRECTOR" || user.role === "PRINCIPAL") return null;

        const otp = await db.otpCode.findFirst({
          where: {
            userId:    user.id,
            code,
            purpose:   "LOGIN",
            usedAt:    null,
            expiresAt: { gt: new Date() },
          },
        });

        if (!otp) {
          await recordLoginFailure(`otp:${credentials.phone as string}`, ip);
          return null;
        }

        await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
        await recordLoginSuccess(`otp:${credentials.phone as string}`);

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
