import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Academic Programmes - Director" };

export default async function DirectorProgrammesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/login");

  const courses = await db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, status: true, courseCode: true } });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Academic Programmes</h1>
        <p className="text-sm text-gray-500 mt-0.5">{courses.length} programme{courses.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Code</th>
              <th className="pb-2 font-medium pr-4">Title</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{c.courseCode ?? "-"}</td>
                <td className="py-2.5 pr-4 font-medium text-primary">{c.title}</td>
                <td className="py-2.5">
                  <span className={`badge text-xs ${c.status === "PUBLISHED" ? "badge-success" : c.status === "ARCHIVED" ? "badge-danger" : "badge-warning"}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
