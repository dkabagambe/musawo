import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Students - Director" };

export default async function DirectorStudentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/login");

  const total = await db.user.count({ where: { role: "STUDENT" } });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Students</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} student accounts</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Student overview coming soon.
      </div>
    </div>
  );
}
