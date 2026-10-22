/**
 * Central post-login redirect helper.
 *
 * Rules:
 *  - callbackUrl is honoured only if it is same-origin and not a known auth page.
 *  - Falls back to role home. Never returns an unknown route.
 *  - Used by: login page, OTP page, register flow, server-side auth callbacks.
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
 *
 *   SUPER_ADMIN              → /director
 *   BOARD_MEMBER             → /board
 *   PRINCIPAL                → /principal
 *   DEPUTY_PRINCIPAL         → /deputy
 *   ACADEMIC_REGISTRAR       → /registrar
 *   INSTRUCTOR               → /tutor
 *   TEACHING_ASSISTANT       → /tutor
 *   FINANCE_OFFICER          → /finance
 *   HR_SYSTEM_ADMIN          → /admin
 *   AUDITOR_READONLY         → /auditor
 *   SYSTEM_IT                → /system
 *   STUDENT                  → /dashboard
 *   Legacy aliases follow their canonical equivalent.
 *   unknown                  → /dashboard  (never a 404)
 */
export function getHomePathForRole(
  role: UserRole | string | undefined | null,
): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "SUPERADMIN":
      return "/director";
    case "BOARD_MEMBER":
      return "/board";
    case "PRINCIPAL":
      return "/principal";
    case "DEPUTY_PRINCIPAL":
      return "/deputy";
    case "ACADEMIC_REGISTRAR":
    case "REGISTRAR":
      return "/registrar";
    case "INSTRUCTOR":
    case "TUTOR":
      return "/tutor";
    case "TEACHING_ASSISTANT":
      return "/tutor";
    case "FINANCE_OFFICER":
    case "BURSAR":
      return "/finance";
    case "HR_SYSTEM_ADMIN":
    case "ADMIN":
      return "/admin";
    case "HR_MANAGER":
    case "ADMINISTRATOR":
      return "/admin";
    case "AUDITOR_READONLY":
      return "/auditor";
    case "SYSTEM_IT":
      return "/system";
    default:
      return "/dashboard"; // STUDENT
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
