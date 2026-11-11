import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import EmailQueuePanel from "@/components/admin/EmailQueuePanel";

export const metadata = { title: "Email Queue - IT Admin" };

export default async function SystemEmailQueuePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "integrations.edit"))
    redirect("/login");

  return <EmailQueuePanel />;
}
