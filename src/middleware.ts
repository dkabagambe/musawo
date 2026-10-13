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
  "/_rbac_redirect", // kept for backward compat — page now redirects server-side
  "/403",
];

const AUTH_ONLY_PAGES = ["/login", "/register", "/otp", "/forgot-password"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_ONLY_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "?")
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

  const session = (req as NextRequest & { auth?: { user?: { role: UserRole } } }).auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  // Logged-in users hitting auth pages → send to their home portal
  if (isLoggedIn && isAuthPage(pathname)) {
    const home = role ? getHomeForRole(role) : "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Always allow public paths for unauthenticated users
  if (isPublic(pathname)) return response;

  // Pass through non-protected routes
  if (!requiresAuth(pathname)) return response;

  // Not logged in hitting a protected path → redirect to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Coarse-grained portal access — redirect to correct home if wrong portal
  const PORTALS = ["/director", "/system", "/admin", "/bursar", "/tutor", "/dashboard"];
  const portal = PORTALS.find((p) => pathname.startsWith(p));

  if (portal && role && !canAccessPrefix(role, portal)) {
    return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
  }

  // API role guards (coarse — fine-grained enforced in each handler)
  if (pathname.startsWith("/api/director") && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/system") && !["SUPERADMIN", "SYSTEM_IT"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/bursar") && !["SUPERADMIN", "BURSAR"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/admin") && !["SUPERADMIN", "REGISTRAR", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/tutor") && !["SUPERADMIN", "TUTOR", "REGISTRAR", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
