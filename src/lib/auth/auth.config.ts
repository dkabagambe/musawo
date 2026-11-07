/**
 * Edge-safe Auth.js config.
 *
 * Rules:
 *  - NO argon2, NO Prisma, NO Redis, NO Node fs/crypto, NO S3
 *  - Only JWT reads - token data is stamped at sign-in time in index.ts
 *  - Imported by middleware.ts (Edge runtime) and spread into the full config
 */

import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  // Trust the reverse proxy (Render / Vercel / nginx) and localhost.
  // In next-auth v5, AUTH_URL or AUTH_TRUST_HOST=true must be set, or
  // NODE_ENV must not be "production". We force trustHost: true here so
  // the edge middleware never throws UntrustedHost regardless of env var order.
  // Production deployments must also set AUTH_TRUST_HOST=true (render.yaml does).
  trustHost: true,

  // No providers here - added in index.ts (Node runtime only)
  providers: [],

  callbacks: {
    // Called on every request by middleware via auth() from this config.
    // Returning false redirects unauthenticated users to the signIn page.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname   = nextUrl.pathname;

      const PROTECTED_PREFIXES = [
        "/director", "/system", "/admin", "/bursar", "/tutor", "/dashboard",
        "/api/admin", "/api/bursar", "/api/director", "/api/system",
        "/api/tutor", "/api/profile", "/api/notifications", "/api/forum",
        "/api/exams", "/api/payments", "/api/certificates", "/api/courses",
        "/api/settings", "/api/approvals",
      ];

      const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
      if (!requiresAuth) return true;
      return isLoggedIn;
    },

    jwt({ token, user }) {
      if (user) {
        token.id          = user.id;
        token.role        = (user as { role: UserRole }).role;
        token.totpEnabled = (user as { totpEnabled: boolean }).totpEnabled ?? false;
      }
      return token;
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id          = token.id          as string;
        session.user.role        = token.role        as UserRole;
        session.user.totpEnabled = token.totpEnabled as boolean;
      }
      return session;
    },
  },
};
