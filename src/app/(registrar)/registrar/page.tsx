import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";
export const dynamic = "force-dynamic";


export const metadata = { title: "Academic Registrar" };

const VALID_TABS = new Set<string>(["general", "admissions", "students", "academics", "reports"]);

async function isRegistrarActive(): Promise<boolean> {
  const setting = await db.siteSetting.findUnique({
    where: { key: "feature.ACADEMIC_REGISTRAR_ACTIVE" },
  });
  return setting?.value === "true";
}

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.lookup")) redirect("/dashboard");

  const active = await isRegistrarActive();

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="card max-w-md w-full space-y-4 py-12">
          <h1 className="text-xl font-semibold text-primary">This role is currently inactive</h1>
          <p className="text-sm text-gray-500">
            The Academic Registrar account has not been activated yet. Please
            contact the Director or Principal to enable access.
          </p>
          <p className="text-xs text-gray-400 font-mono">Setting: ACADEMIC_REGISTRAR_ACTIVE = false</p>
        </div>
      </div>
    );
  }

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
