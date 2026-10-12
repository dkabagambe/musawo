/**
 * Next.js middleware — runs in the Edge runtime.
 *
 * IMPORTANT: only imports edge-safe modules.
 * - Uses authConfig (no argon2, no Prisma, no Redis)
 * - Role guards read from the JWT token only
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";
import { canAccessPrefix, getHomeForRole } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/",
  "/courses",
  "/resources",
  "/verify",
  "/partner",
  "/login",
  "/register",
  "/otp",
  "/forgot-password",
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/assets",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/approval",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

const PROTECTED_PREFIXES = [
  "/director", "/system", "/admin", "/bursar", "/tutor", "/dashboard",
  "/api/admin", "/api/bursar", "/api/director", "/api/system",
  "/api/tutor", "/api/profile", "/api/notifications", "/api/forum",
  "/api/exams", "/api/payments", "/api/certificates", "/api/courses",
  "/api/settings", "/api/approvals",
];

function requiresAuth(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Security headers on every response
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Always allow public paths
  if (isPublic(pathname)) return response;

  // Pass through non-protected routes
  if (!requiresAuth(pathname)) return response;

  // Auth.js attaches the session to req.auth when using the auth() wrapper
  const session = (req as NextRequest & { auth?: { user?: { role: UserRole } } }).auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role } = session.user;

  // Coarse-grained portal access — redirect to correct home if wrong portal
  const PORTALS = ["/director", "/system", "/admin", "/bursar", "/tutor", "/dashboard"];
  const portal = PORTALS.find((p) => pathname.startsWith(p));

  if (portal && !canAccessPrefix(role, portal)) {
    return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
  }

  // API role guards (coarse — fine-grained enforced in each handler)
  if (pathname.startsWith("/api/director") && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/system") && !["SUPERADMIN", "SYSTEM_IT"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/bursar") && !["SUPERADMIN", "BURSAR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/admin") && !["SUPERADMIN", "REGISTRAR", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/tutor") && !["SUPERADMIN", "TUTOR", "REGISTRAR", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
