import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Instructors - Director" };

export default async function DirectorInstructorsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.view")) redirect("/login");

  const total = await db.user.count({ where: { role: "INSTRUCTOR" } });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Instructors</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} instructor account{total !== 1 ? "s" : ""}</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Instructor overview coming soon.
      </div>
    </div>
  );
}
