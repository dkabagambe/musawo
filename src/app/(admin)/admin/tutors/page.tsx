import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Image from "next/image";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Instructors - Admin" };

export default async function AdminInstructorsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      _count: {
        select: {
          coursesTaught: true, // main tutor
          coTutorCourses: true, // co-tutor
          liveClasses: true, // classes held
        },
      },
      coursesTaught: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
        take: 5,
      },
      updatedAt: true,
    },
  });

  // Get scheduled classes count for each instructor
  const scheduledCounts = await Promise.all(
    instructors.map(async (instructor) => {
      const scheduled = await db.liveClass.count({
        where: {
          tutorId: instructor.id,
          status: "SCHEDULED",
        },
      });
      return { id: instructor.id, scheduled };
    }),
  );

  const scheduledMap = Object.fromEntries(
    scheduledCounts.map((s) => [s.id, s.scheduled]),
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Instructors</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and maintain instructor records. Account creation and deactivation managed by the Principal.
        </p>
      </div>

      {instructors.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">👨‍🏫</p>
          <p className="text-gray-500 text-sm">No instructors found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instructors.map((instructor) => {
            const totalCourses = instructor._count.coursesTaught + instructor._count.coTutorCourses;
            const held = instructor._count.liveClasses;
            const scheduled = scheduledMap[instructor.id] || 0;

            return (
              <div key={instructor.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                    {instructor.avatarUrl ? (
                      <Image
                        src={instructor.avatarUrl}
                        alt={instructor.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-gray-400">
                        {instructor.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg">{instructor.name}</h2>
                    <p className="text-sm text-gray-500">{instructor.email}</p>
                    {instructor.phone && (
                      <p className="text-sm text-gray-500">{instructor.phone}</p>
                    )}

                    {instructor.coursesTaught.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Courses taught:</p>
                        <div className="flex flex-wrap gap-2">
                          {instructor.coursesTaught.map((course) => (
                            <span
                              key={course.id}
                              className="text-xs px-2 py-1 rounded bg-accent/10 text-accent"
                            >
                              {course.courseCode || course.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">{totalCourses}</span> courses
                      </div>
                      <div>
                        <span className="font-medium">{held}</span> classes held
                      </div>
                      <div>
                        <span className="font-medium">{scheduled}</span> scheduled
                      </div>
                      <div>
                        Last active:{" "}
                        {new Date(instructor.updatedAt).toLocaleDateString("en-UG")}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/tutors/${instructor.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      View Details
                    </Link>
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
