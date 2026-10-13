import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "My Students - Tutor" };

export default async function TutorStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: {
      status: { in: ["ACTIVE", "COMPLETED"] },
      course: { tutorId: session.user.id },
    },
    include: {
      user: { select: { name: true, email: true, phone: true, studentNumber: true } },
      course: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">My Students ({enrolments.length})</h1>

      {enrolments.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">No students enrolled in your courses yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrolments.map((enr) => (
                <tr key={enr.id}>
                  <td className="py-2 pr-4">
                    <p className="font-medium">{enr.user.name}</p>
                    <p className="text-xs text-gray-400">{enr.user.studentNumber ?? enr.user.email}</p>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{enr.course.title}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge text-xs ${enr.status === "COMPLETED" ? "badge-success" : "badge-info"}`}>
                      {enr.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {new Date(enr.createdAt).toLocaleDateString("en-UG")}
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
