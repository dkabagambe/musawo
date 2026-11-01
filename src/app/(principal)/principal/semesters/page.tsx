import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Academic Years & Semesters - Principal" };

export default async function PrincipalSemestersPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  // Intakes serve as the semester/intake period equivalent
  const intakes = await db.intake.findMany({
    orderBy: [{ isOpen: "desc" }, { startDate: "desc" }],
    include: {
      course: { select: { title: true, courseCode: true } },
      _count: { select: { enrolments: true, applications: true } },
    },
  });

  const now = new Date();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Academic Years &amp; Semesters</h1>
        <p className="text-sm text-gray-500 mt-1">
          Intake periods across all programmes
        </p>
      </div>

      {intakes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-500 text-sm">No intakes configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {intakes.map((intake) => {
            const isActive = intake.isOpen && intake.startDate <= now && intake.endDate >= now;
            const isUpcoming = intake.startDate > now;
            const isPast = intake.endDate < now;
            return (
              <div key={intake.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold">{intake.label}</h2>
                      {isActive && <span className="badge badge-success text-xs">Active</span>}
                      {isUpcoming && <span className="badge badge-info text-xs">Upcoming</span>}
                      {isPast && <span className="badge text-xs">Past</span>}
                      {!intake.isOpen && <span className="badge badge-danger text-xs">Closed</span>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {intake.course.title}{" "}
                      {intake.course.courseCode ? `(${intake.course.courseCode})` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(intake.startDate).toLocaleDateString("en-UG")} to{" "}
                      {new Date(intake.endDate).toLocaleDateString("en-UG")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">{intake._count.enrolments}</p>
                    <p className="text-xs text-gray-400">enrolled</p>
                    <p className="text-sm font-medium mt-1">{intake._count.applications}</p>
                    <p className="text-xs text-gray-400">applications</p>
                    <p className="text-xs text-gray-400 mt-1">{intake.seats} seats</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
