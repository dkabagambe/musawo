/**
 * Central post-login redirect helper.
 *
 * Pure string utilities — no framework imports, no Prisma, no Node APIs.
 * Safe to import from any "use client" component.
 *
 * Role model:
 *   DIRECTOR           -> /director
 *   PRINCIPAL          -> /principal
 *   ADMIN              -> /admin
 *   ACADEMIC_REGISTRAR -> /registrar
 *   INSTRUCTOR         -> /tutor
 *   SYSTEM_IT          -> /system
 *   STUDENT            -> /dashboard
 *   ARCHIVED           -> /login?error=account_archived
 */

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
export function getHomePathForRole(role: string | undefined | null): string {
  switch (role) {
    case "DIRECTOR":           return "/director";
    case "PRINCIPAL":          return "/principal";
    case "ADMIN":              return "/admin";
    case "ACADEMIC_REGISTRAR": return "/registrar";
    case "INSTRUCTOR":         return "/tutor";
    case "SYSTEM_IT":          return "/system";
    case "STUDENT":            return "/dashboard";
    case "ARCHIVED":           return "/login?error=account_archived";
    // Legacy aliases
    case "SUPER_ADMIN":
    case "SUPERADMIN":
    case "BOARD_MEMBER":
    case "AUDITOR_READONLY":   return "/director";
    case "DEPUTY_PRINCIPAL":   return "/principal";
    case "FINANCE_OFFICER":
    case "BURSAR":             return "/director";
    case "HR_SYSTEM_ADMIN":
    case "HR_MANAGER":
    case "ADMINISTRATOR":
    case "ADMIN_LEGACY":       return "/admin";
    case "TEACHING_ASSISTANT":
    case "TUTOR":              return "/tutor";
    case "REGISTRAR":          return "/registrar";
    default:                   return "/dashboard";
  }
}

/**
 * Returns a safe redirect destination after login.
 */
export function getPostLoginPath(
  role: string | undefined | null,
  callbackUrl?: string | null,
  origin?: string,
): string {
  const home = getHomePathForRole(role);
  if (!callbackUrl) return home;

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

  if (!callbackUrl.startsWith("/")) return home;
  return isSafePath(callbackUrl) ? callbackUrl : home;
}

function isSafePath(path: string): boolean {
  const pathname = path.split("?")[0];
  if (AUTH_PAGES.has(pathname)) return false;
  if (path.includes("..")) return false;
  return true;
}
