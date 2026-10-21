import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "System IT Dashboard" };

const VALID_TABS = new Set<string>(["general", "system", "logs"]);

export default async function SystemDashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (
    !session?.user ||
    !["SUPER_ADMIN", "SYSTEM_IT", "SUPERADMIN"].includes(session.user.role)
  )
    redirect("/login");

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
