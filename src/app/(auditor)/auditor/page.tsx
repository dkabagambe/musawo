import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Auditor Overview" };

const VALID_TABS = new Set<string>(["general", "audit", "reports"]);

export default async function AuditorPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/login");

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
