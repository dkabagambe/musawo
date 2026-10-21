import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Deputy Principal" };

const VALID_TABS = new Set<string>([
  "general", "academics", "support", "reports",
]);

export default async function DeputyPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  const tab = (searchParams.tab && VALID_TABS.has(searchParams.tab)
    ? searchParams.tab
    : "general") as DashboardTab;

  return (
    <DashboardTabBody
      userId={session.user.id}
      role={session.user.role}
      tab={tab}
    />
  );
}
