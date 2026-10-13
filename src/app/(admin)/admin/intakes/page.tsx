import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Intakes - Admin" };

export default async function AdminIntakesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/dashboard");

  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      intakes: { orderBy: { startDate: "asc" } },
    },
    orderBy: { title: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Intakes</h1>
      </div>

      {courses.every((c) => c.intakes.length === 0) && (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">No intakes defined yet.</p>
        </div>
      )}

      {courses.map((course) =>
        course.intakes.length > 0 ? (
          <section key={course.id} className="card mb-6">
            <h2 className="font-semibold mb-4">{course.title}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Label</th>
                    <th className="pb-2 font-medium pr-4">Start</th>
                    <th className="pb-2 font-medium pr-4">End</th>
                    <th className="pb-2 font-medium pr-4 text-center">Seats</th>
                    <th className="pb-2 font-medium pr-4 text-center">Scholarship</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {course.intakes.map((intake) => (
                    <tr key={intake.id}>
                      <td className="py-2 pr-4 font-medium">{intake.label}</td>
                      <td className="py-2 pr-4 text-gray-500">
                        {new Date(intake.startDate).toLocaleDateString("en-UG")}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {new Date(intake.endDate).toLocaleDateString("en-UG")}
                      </td>
                      <td className="py-2 pr-4 text-center">{intake.seats}</td>
                      <td className="py-2 pr-4 text-center">{intake.scholarshipSeats}</td>
                      <td className="py-2">
                        {intake.isOpen ? (
                          <span className="badge badge-success">Open</span>
                        ) : (
                          <span className="badge badge-danger">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
