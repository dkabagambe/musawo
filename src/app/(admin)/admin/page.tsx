import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Admin Overview" };

const VALID_TABS = new Set<string>([
  "general",
  "staff",
  "leave",
  "support",
  "timetable",
  "operations",
]);

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    !can(session.user.role, "staff.view") &&
    !can(session.user.role, "support.manage") &&
    !can(session.user.role, "settings.edit.operational") &&
    !can(session.user.role, "students.lookup")
  )
    redirect("/login");

  const tab = (
    searchParams.tab && VALID_TABS.has(searchParams.tab)
      ? searchParams.tab
      : "general"
  ) as DashboardTab;

  return (
    <DashboardTabBody
      userId={session.user.id}
      role={session.user.role}
      tab={tab}
    />
  );
}
