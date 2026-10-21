import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Tutor Dashboard" };

const VALID_TABS = new Set<string>([
  "general", "teaching", "students", "assessment", "support",
]);

export default async function TutorDashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
