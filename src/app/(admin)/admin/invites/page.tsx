import { auth } from "@/lib/auth/server";
import { can, canManageAccountRecoveryTarget } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import InviteActions from "@/components/ui/InviteActions";
export const dynamic = "force-dynamic";


export const metadata = { title: "Student Invitations - Admin" };

export default async function PendingInvitesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "invites.resend"))
    redirect("/403");
  
  // Get pending students (created but not yet activated)
  const pendingStudents = await db.user.findMany({
    where: {
      role: "STUDENT",
      status: { in: ["PENDING", "INVITED"] },
      emailVerified: null,
    },
    include: {
      enrolments: {
        take: 1,
        include: {
          course: { select: { title: true, courseCode: true } },
          intake: { select: { label: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const [staffInvites, settings] = await Promise.all([
    db.staffInvite.findMany({
      where: { acceptedAt: null, userId: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      take: 100,
    }),
    getAllSettings(),
  ]);
  
  const visibleInvites = staffInvites.filter((invite) =>
    canManageAccountRecoveryTarget(invite.role),
  );
  
  const labels = Object.fromEntries(
    Object.entries(settings)
      .filter(([key]) => key.startsWith("role.label."))
      .map(([key, value]) => [key.slice("role.label.".length), value]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        subtitle="Manage student and staff invitations"
      />
      
      {/* Student Invitations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Student Invitations</h2>
          <span className="badge badge-info">{pendingStudents.length} pending</span>
        </div>
        
        {pendingStudents.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No pending student invitations.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-gray-500">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Registration No.</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="p-3">{student.name}</td>
                    <td className="p-3">{student.email}</td>
                    <td className="p-3 font-mono text-xs">{student.studentNumber || "Pending"}</td>
                    <td className="p-3 text-xs">
                      {student.enrolments[0]?.course.title ?? "N/A"}
                    </td>
                    <td className="p-3">
                      <span className={`badge text-xs ${
                        student.status === "PENDING" ? "badge-warning" :
                        student.status === "INVITED" ? "badge-info" :
                        "badge-success"
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(student.createdAt).toLocaleDateString("en-UG")}
                      <br />
                      <span className="text-gray-400">
                        {Math.floor((Date.now() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </span>
                    </td>
                    <td className="p-3">
                      <StudentInviteActions studentId={student.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Invitations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Staff Invitations</h2>
          <span className="badge badge-info">{visibleInvites.length} pending</span>
        </div>
        
        {visibleInvites.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No pending staff invites.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-gray-500">
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Sent</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="p-3">{invite.email}</td>
                    <td className="p-3">{labels[invite.role] ?? invite.role}</td>
                    <td className="p-3 text-gray-500">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <InviteActions inviteId={invite.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Client component for student invite actions
import StudentInviteActions from "./StudentInviteActions";
