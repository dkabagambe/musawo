import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import EmailQueuePanel from "@/components/admin/EmailQueuePanel";

export const metadata = { title: "Email Queue - Admin" };

export default async function AdminEmailQueuePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view"))
    redirect("/login");

  return <EmailQueuePanel />;
}
