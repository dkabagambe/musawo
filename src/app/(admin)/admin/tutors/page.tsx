import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import InviteStaffForm from "./InviteStaffForm";
import InviteActions from "@/components/ui/InviteActions";
import { getAllSettings } from "@/lib/settings";
export const metadata = { title: "Staff - Admin" };

export default async function AdminTutorsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.view")) redirect("/dashboard");

  const canInvite = can(session.user.role, "staff.create.initiate");

  // Show tutors and lecturers
  const staff = await db.user.findMany({
    where: { role: { in: ["INSTRUCTOR", "TEACHING_ASSISTANT", "ACADEMIC_REGISTRAR"] } },
    orderBy: { createdAt: "desc" },
    include: {
      taughtCourses: { select: { id: true, title: true, status: true } },
      coTaughtCourses: { include: { course: { select: { id: true, title: true, status: true } } } },
    },
  });

  const [courses, settings] = await Promise.all([db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  }), getAllSettings()]);
  const roleLabels = Object.fromEntries(
    Object.entries(settings).filter(([key]) => key.startsWith("role.label.")).map(([key, value]) => [key.slice("role.label.".length), value])
  );

  // Pending invites
  const pendingInvites = await db.staffInvite.findMany({
    where: { acceptedAt: null, userId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Staff and tutors</h1>
      </div>

      {canInvite && (
        <InviteStaffForm courses={courses} roleLabels={roleLabels} />
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Pending invites</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Email</th>
                  <th className="pb-2 font-medium pr-4">Role</th>
                  <th className="pb-2 font-medium pr-4">Sent</th>
                  <th className="pb-2 font-medium pr-4">Expires</th>
                  <th className="pb-2 font-medium">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingInvites.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 pr-4">{inv.email}</td>
                    <td className="py-2 pr-4 text-gray-500">{roleLabels[inv.role] ?? inv.role}</td>
                    <td className="py-2 pr-4 text-gray-400 text-xs">
                      {new Date(inv.createdAt).toLocaleDateString("en-UG")}
                    </td>
                    <td className="py-2 text-gray-400 text-xs">
                      {new Date(inv.expiresAt).toLocaleDateString("en-UG")}
                    </td>
                    <td className="py-2">{canInvite ? <InviteActions inviteId={inv.id} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active staff */}
      <section>
        <h2 className="font-semibold text-lg mb-3">Active staff</h2>
        {staff.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-gray-500 text-sm">No staff yet. Use the invite form above to add tutors or lecturers.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Name</th>
                  <th className="pb-2 font-medium pr-4">Email</th>
                  <th className="pb-2 font-medium pr-4">Role</th>
                  <th className="pb-2 font-medium pr-4">Status</th>
                  <th className="pb-2 font-medium pr-4">Courses</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-4 font-medium">{t.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{t.email ?? "-"}</td>
                    <td className="py-2 pr-4 text-gray-400 text-xs">{roleLabels[t.role] ?? t.role}</td>
                    <td className="py-2 pr-4">
                      {t.status === "ACTIVE" ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">{t.status}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {[...t.taughtCourses, ...t.coTaughtCourses.map(({ course }) => course)].length === 0 ? (
                          <span className="text-gray-400 text-xs">None</span>
                        ) : (
                          [...t.taughtCourses, ...t.coTaughtCourses.map(({ course }) => course)].map((c) => (
                            <span key={c.id} className="badge badge-info text-xs">{c.title}</span>
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
      </section>
    </div>
  );
}
