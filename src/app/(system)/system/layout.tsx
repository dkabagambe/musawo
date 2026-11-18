import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import ITAdminSidebar from "./ITAdminSidebar";

const TABS = ["general", "system", "logs"] as const;

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "integrations.edit")) redirect("/login");
  const name = session.user.name ?? "IT Admin";
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* IT Admin Custom Sidebar */}
      <ITAdminSidebar userName={name} userAvatarUrl={dbUser?.avatarUrl ?? null} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}