/**
 * Central post-login redirect helper.
 *
 * Rules:
 *  - callbackUrl is honoured only if it is same-origin and not a known auth page.
 *  - Falls back to role home. Never returns an unknown route.
 *  - Used by: login page, OTP page, register flow, server-side auth callbacks.
 *
 * Role model (remarks.md batch 1A):
 *   DIRECTOR           -> /director
 *   PRINCIPAL          -> /principal
 *   ADMIN              -> /admin
 *   ACADEMIC_REGISTRAR -> /registrar
 *   INSTRUCTOR         -> /tutor
 *   SYSTEM_IT          -> /system
 *   STUDENT            -> /dashboard
 *   ARCHIVED           -> /login?error=account_archived
 *
 * Legacy aliases (kept to avoid 404s during session data migration):
 *   SUPER_ADMIN / SUPERADMIN / BOARD_MEMBER -> /director
 *   DEPUTY_PRINCIPAL                         -> /principal
 *   FINANCE_OFFICER / BURSAR                 -> /director (no /finance portal)
 *   HR_SYSTEM_ADMIN / HR_MANAGER / ADMINISTRATOR / ADMIN -> /admin
 *   AUDITOR_READONLY                          -> /director
 *   TEACHING_ASSISTANT / TUTOR               -> /tutor
 *   REGISTRAR                                -> /registrar
 */

import type { UserRole } from "@prisma/client";

const AUTH_PAGES = new Set([
  "/login",
  "/register",
  "/otp",
  "/forgot-password",
  "/_rbac_redirect",
]);

/**
 * Returns the correct home path for a role.
 * Never returns a path that does not exist; unknown roles fall back to /dashboard.
 */
export function getHomePathForRole(
  role: UserRole | string | undefined | null,
): string {
  switch (role) {
    // ── New canonical roles ────────────────────────────────────────────
    case "DIRECTOR":
      return "/director";
    case "PRINCIPAL":
      return "/principal";
    case "ADMIN":
      return "/admin";
    case "ACADEMIC_REGISTRAR":
      return "/registrar";
    case "INSTRUCTOR":
      return "/tutor";
    case "SYSTEM_IT":
      return "/system";
    case "STUDENT":
      return "/dashboard";
    case "ARCHIVED":
      return "/login?error=account_archived";

    // ── Legacy aliases (old role names that may exist in sessions) ─────
    // All map to the closest new portal so old sessions do not 404.
    case "SUPER_ADMIN":
    case "SUPERADMIN":
    case "BOARD_MEMBER":
    case "AUDITOR_READONLY":
      return "/director";
    case "DEPUTY_PRINCIPAL":
      return "/principal";
    case "FINANCE_OFFICER":
    case "BURSAR":
      return "/director";
    case "HR_SYSTEM_ADMIN":
    case "HR_MANAGER":
    case "ADMINISTRATOR":
    case "ADMIN_LEGACY":
      return "/admin";
    case "TEACHING_ASSISTANT":
    case "TUTOR":
      return "/tutor";
    case "REGISTRAR":
      return "/registrar";

    default:
      return "/dashboard"; // STUDENT and any unknown role
  }
}

/**
 * Returns a safe redirect destination after login.
 *
 * @param role         The authenticated user's role.
 * @param callbackUrl  Optional URL from the query string (user was trying to visit this page).
 * @param origin       The request origin for same-origin validation (e.g. "http://localhost:3000").
 */
export function getPostLoginPath(
  role: UserRole | string | undefined | null,
  callbackUrl?: string | null,
  origin?: string,
): string {
  const home = getHomePathForRole(role);

  if (!callbackUrl) return home;

  // Reject absolute URLs to a different origin
  if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
    try {
      const url = new URL(callbackUrl);
      if (origin && url.origin !== origin) return home;
      const path = url.pathname + url.search;
      return isSafePath(path) ? path : home;
    } catch {
      return home;
    }
  }

  // Must start with / (relative path)
  if (!callbackUrl.startsWith("/")) return home;

  return isSafePath(callbackUrl) ? callbackUrl : home;
}

function isSafePath(path: string): boolean {
  // Strip query string for the auth page check
  const pathname = path.split("?")[0];
  if (AUTH_PAGES.has(pathname)) return false;
  // Must not go up directories
  if (path.includes("..")) return false;
  return true;
}
