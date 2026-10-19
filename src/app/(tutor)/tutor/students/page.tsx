import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Users } from "lucide-react";

export const metadata = { title: "My Students" };

export default async function TutorStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { status: { in: ["ACTIVE","COMPLETED"] }, course: { tutorId: session.user.id } },
    include: {
      user: { select: { name: true, email: true, phone: true, studentNumber: true } },
      course: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by course
  const byCourse: Record<string, typeof enrolments> = {};
  for (const e of enrolments) {
    const key = `${e.courseId}::${e.course.title}`;
    if (!byCourse[key]) byCourse[key] = [];
    byCourse[key].push(e);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Students</h1>
        <p className="text-gray-500 text-sm mt-1">{enrolments.length} enrolled student{enrolments.length !== 1 ? "s" : ""}</p>
      </div>

      {enrolments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No students enrolled in your courses yet.</p>
        </div>
      ) : (
        Object.entries(byCourse).map(([key, rows]) => {
          const courseTitle = key.split("::")[1];
          return (
            <section key={key} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/50">
                <h2 className="font-bold text-primary">{courseTitle}</h2>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {rows.length} student{rows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-border">
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider">Student</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Student No.</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Contact</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((enr) => (
                      <tr key={enr.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {enr.user.name.charAt(0)}
                            </div>
                            <span className="font-medium text-primary">{enr.user.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="font-mono text-xs text-gray-500">{enr.user.studentNumber ?? "-"}</span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell text-xs text-gray-400">
                          {enr.user.email ?? enr.user.phone ?? "-"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${enr.status === "COMPLETED" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                            {enr.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell text-xs text-gray-400">
                          {new Date(enr.createdAt).toLocaleDateString("en-UG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
