import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Instructors - Director" };

export default async function DirectorInstructorsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.view")) redirect("/login");

  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, phone: true, status: true, createdAt: true,
      liveClasses: {
        where: { status: { in: ["LIVE", "SCHEDULED"] } },
        select: { id: true },
      },
      _count: {
        select: { liveClasses: true },
      },
    },
  });

  const courseAssignments = await db.course.findMany({
    select: { tutorId: true, title: true, status: true },
  });

  const coursesByInstructor: Record<string, { title: string; status: string }[]> = {};
  for (const c of courseAssignments) {
    if (c.tutorId) {
      if (!coursesByInstructor[c.tutorId]) coursesByInstructor[c.tutorId] = [];
      coursesByInstructor[c.tutorId].push({ title: c.title, status: c.status });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Instructors</h1>
        <p className="text-sm text-gray-500 mt-0.5">{instructors.length} instructor{instructors.length !== 1 ? "s" : ""}</p>
      </div>

      {instructors.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 text-sm">No instructors on record.</div>
      ) : (
        <div className="space-y-3">
          {instructors.map((i) => {
            const courses = coursesByInstructor[i.id] ?? [];
            const liveCls = i.liveClasses.length;
            return (
              <div key={i.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-primary">{i.name}</h2>
                      <span className={`badge text-xs ${i.status === "ACTIVE" ? "badge-success" : "badge-danger"}`}>
                        {i.status}
                      </span>
                      {liveCls > 0 && (
                        <span className="badge badge-warning text-xs">{liveCls} active class{liveCls !== 1 ? "es" : ""}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{i.email ?? i.phone ?? "-"}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    Joined {new Date(i.createdAt).toLocaleDateString("en-UG")}
                  </p>
                </div>
                {courses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {courses.map((c) => (
                      <span key={c.title} className={`text-xs px-2.5 py-1 rounded-full ${c.status === "PUBLISHED" ? "bg-primary/10 text-primary" : "bg-surface text-gray-500"}`}>
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}
                {courses.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">Not assigned to any courses.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
