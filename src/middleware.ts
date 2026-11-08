/**
 * Next.js middleware - Edge runtime.
 * Role guards read from JWT only (no DB, no Redis).
 * All permission checks use canAccessPrefix / getHomeForRole -- no role names here.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";
import { canAccessPrefix, getHomeForRole } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

const { auth } = NextAuth(authConfig);

// ─── Paths that always bypass the demo gate ──────────────────────────────────
const GATE_BYPASS = ["/api/health", "/api/webhooks", "/_next", "/favicon.ico"];

function shouldBypassGate(pathname: string): boolean {
  return GATE_BYPASS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

// ─── Demo gate (HTTP Basic Auth) ─────────────────────────────────────────────
function demoGate(req: NextRequest): NextResponse | null {
  const user = process.env.DEMO_GATE_USER;
  const pass = process.env.DEMO_GATE_PASSWORD;
  if (!user || !pass) return null; // gate inactive

  const { pathname } = req.nextUrl;
  if (shouldBypassGate(pathname)) return null;

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Basic ")) {
    const b64 = authHeader.slice(6);
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    const [u, ...rest] = decoded.split(":");
    const p = rest.join(":");
    if (u === user && p === pass) return null; // allowed
  }

  const res = new NextResponse("Demo access restricted", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Musawo Training Center Demo", charset="UTF-8"');
  return res;
}

const PUBLIC_PATHS = [
  "/",
  "/courses",
  "/apply",
  "/about",
  "/faq",
  "/contact",
  "/admissions",
  "/learning",
  "/resources",
  "/privacy",
  "/terms",
  "/refund",
  "/verify",
  "/partner",
  "/login",
  "/otp",
  "/forgot-password",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/api/apply",
  "/_next",
  "/assets",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/approval",
  "/_rbac_redirect",
  "/403",
  "/invite",
  "/check-email",
  "/resend-verification",
];

const AUTH_ONLY_PAGES = ["/login", "/otp", "/forgot-password"];

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

// All portal and API prefixes that require authentication
const PROTECTED_PREFIXES = [
  "/director", "/board", "/principal", "/deputy", "/registrar",
  "/admin", "/finance", "/bursar", "/tutor", "/auditor", "/system", "/dashboard",
  "/api/admin", "/api/finance", "/api/bursar", "/api/director", "/api/system",
  "/api/tutor", "/api/profile", "/api/notifications", "/api/forum",
  "/api/exams", "/api/payments", "/api/certificates", "/api/courses",
  "/api/settings", "/api/approvals", "/api/principal", "/api/registrar",
  "/api/board", "/api/deputy", "/api/auditor",
];

function requiresAuth(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

// Coarse API guards: map API prefix -> allowed portal prefix
// canAccessPrefix handles the actual role check
const API_PORTAL_MAP: Array<{ apiPrefix: string; portalPrefix: string }> = [
  { apiPrefix: "/api/director",  portalPrefix: "/director"  },
  { apiPrefix: "/api/board",     portalPrefix: "/board"     },
  { apiPrefix: "/api/principal", portalPrefix: "/principal" },
  { apiPrefix: "/api/deputy",    portalPrefix: "/deputy"    },
  { apiPrefix: "/api/registrar", portalPrefix: "/registrar" },
  { apiPrefix: "/api/system",    portalPrefix: "/system"    },
  { apiPrefix: "/api/finance",   portalPrefix: "/finance"   },
  { apiPrefix: "/api/bursar",    portalPrefix: "/finance"   }, // legacy alias
  { apiPrefix: "/api/auditor",   portalPrefix: "/auditor"   },
  { apiPrefix: "/api/admin",     portalPrefix: "/admin"     },
  { apiPrefix: "/api/tutor",     portalPrefix: "/tutor"     },
];

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Demo gate (HTTP Basic Auth) — checked before everything else
  const gated = demoGate(req);
  if (gated) return gated;

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

  const session = (req as NextRequest & { auth?: { user?: { role: UserRole; totpEnabled?: boolean } } }).auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  // /register -> /apply (self-registration is disabled)
  if (pathname === "/register" || pathname.startsWith("/register?")) {
    return NextResponse.redirect(new URL("/apply", req.url));
  }

  // /bursar -> /finance (legacy redirect for bookmarks)
  if (pathname === "/bursar" || pathname.startsWith("/bursar/")) {
    return NextResponse.redirect(
      new URL(pathname.replace("/bursar", "/finance"), req.url)
    );
  }

  // DIRECTOR and PRINCIPAL must have TOTP enabled.
  // If they are logged in but have not set up TOTP yet, redirect them to
  // /2fa-setup on every protected page until setup is complete.
  // Allow /2fa-setup, /api/auth/totp, and /signout so they can complete setup or log out.
  const TOTP_REQUIRED_ROLES: UserRole[] = ["DIRECTOR", "PRINCIPAL"];
  const totpSetupPaths = ["/2fa-setup", "/api/auth/totp", "/signout", "/api/auth"];
  const needsTotpSetup =
    isLoggedIn &&
    role &&
    TOTP_REQUIRED_ROLES.includes(role) &&
    session?.user?.totpEnabled === false &&
    !totpSetupPaths.some((p) => pathname.startsWith(p));

  if (needsTotpSetup) {
    return NextResponse.redirect(new URL("/2fa-setup?required=1", req.url));
  }

  // Logged-in users hitting auth pages -> send to their portal
  if (isLoggedIn && isAuthPage(pathname)) {
    const home = role ? getHomeForRole(role) : "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (isPublic(pathname)) return response;
  if (!requiresAuth(pathname)) return response;

  // Not logged in -> login page
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Portal coarse guard: wrong portal -> redirect to correct home
  const PORTALS = [
    "/director", "/board", "/principal", "/deputy", "/registrar",
    "/admin", "/finance", "/tutor", "/auditor", "/system", "/dashboard",
  ];
  const portal = PORTALS.find((p) => pathname.startsWith(p));
  if (portal && role && !canAccessPrefix(role, portal)) {
    return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
  }

  // API coarse guards using portal map
  for (const { apiPrefix, portalPrefix } of API_PORTAL_MAP) {
    if (pathname.startsWith(apiPrefix)) {
      if (!role || !canAccessPrefix(role, portalPrefix)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      break;
    }
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
