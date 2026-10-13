/**
 * Legacy fallback redirect page.
 * Any old link or bookmark that still points to /_rbac_redirect will land
 * here and be forwarded to the correct portal for their role.
 *
 * New code should use getPostLoginPath() from @/lib/auth/redirect directly.
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHomePathForRole } from "@/lib/auth/redirect";

export default async function RbacRedirectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(getHomePathForRole(session.user.role));
}
