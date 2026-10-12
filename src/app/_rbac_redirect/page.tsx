import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHomeForRole } from "@/lib/rbac";

export default async function RbacRedirectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(getHomeForRole(session.user.role));
}
