import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Classes and Groups - Admin" };

export default async function AdminClassesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  // Get all intakes with their courses and student counts
  const intakes = await db.intake.findMany({
    orderBy: [{ startDate: "desc" }],
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      _count: {
        select: {
          enrolments: true,
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Classes and Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          Class cohorts per intake and programme. Allocate students, manage rosters, and organize breakaway groups.
        </p>
      </div>

      {intakes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">No class cohorts found.</p>
          <p className="text-xs text-gray-400 mt-2">Intakes are created by the Principal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {intakes.map((intake) => (
            <div key={intake.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-semibold text-lg">{intake.label}</h2>
                    {intake.isOpen ? (
                      <span className="badge badge-success text-xs">Open</span>
                    ) : (
                      <span className="badge badge-danger text-xs">Closed</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {intake.course.courseCode} - {intake.course.title}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>
                      Start: {new Date(intake.startDate).toLocaleDateString("en-UG")}
                    </span>
                    <span>
                      End: {new Date(intake.endDate).toLocaleDateString("en-UG")}
                    </span>
                    <span>{intake.seats} seats</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-accent">{intake._count.enrolments}</p>
                  <p className="text-xs text-gray-500">students</p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Link
                  href={`/admin/classes/${intake.id}`}
                  className="btn btn-sm btn-primary"
                >
                  View Roster
                </Link>
                <Link
                  href={`/admin/classes/${intake.id}/allocate`}
                  className="btn btn-sm btn-secondary"
                >
                  Allocate Students
                </Link>
                <Link
                  href={`/admin/classes/${intake.id}/groups`}
                  className="btn btn-sm btn-secondary"
                >
                  Breakaway Groups
                </Link>
                <Link
                  href={`/admin/classes/${intake.id}/export`}
                  className="btn btn-sm btn-outline"
                >
                  Export List
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
