import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const metadata = { title: "Tutors - Admin" };

export default async function AdminTutorsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.view")) redirect("/dashboard");

  const tutors = await db.user.findMany({
    where: { role: "TUTOR" },
    orderBy: { createdAt: "desc" },
    include: {
      taughtCourses: { select: { id: true, title: true, status: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Tutors</h1>
      </div>

      {tutors.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">No tutors yet. Promote a user to TUTOR role to get started.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Name</th>
                <th className="pb-2 font-medium pr-4">Email</th>
                <th className="pb-2 font-medium pr-4">Phone</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4">Courses</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tutors.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 font-medium">{t.name}</td>
                  <td className="py-2 pr-4 text-gray-500">{t.email ?? "-"}</td>
                  <td className="py-2 pr-4 text-gray-500">{t.phone ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {t.status === "ACTIVE" ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">{t.status}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {t.taughtCourses.length === 0 ? (
                        <span className="text-gray-400 text-xs">None</span>
                      ) : (
                        t.taughtCourses.map((c) => (
                          <span key={c.id} className="badge badge-info text-xs">
                            {c.title}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {new Date(t.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
