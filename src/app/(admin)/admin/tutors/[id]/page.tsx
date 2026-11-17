import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Image from "next/image";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Instructor Details - Admin" };

export default async function AdminInstructorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const instructor = await db.user.findUnique({
    where: { id: params.id, role: "INSTRUCTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          coursesTaught: true,
          coTutorCourses: true,
          liveClasses: true,
        },
      },
      coursesTaught: {
        select: {
          id: true,
          title: true,
          courseCode: true,
          status: true,
        },
      },
      coTutorCourses: {
        select: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
              status: true,
            },
          },
        },
      },
      liveClasses: {
        where: {
          scheduledAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // last 90 days
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          status: true,
          course: {
            select: {
              title: true,
              courseCode: true,
            },
          },
          _count: {
            select: { attendance: true },
          },
        },
      },
    },
  });

  if (!instructor) notFound();

  const scheduled = await db.liveClass.count({
    where: {
      tutorId: instructor.id,
      status: "SCHEDULED",
    },
  });

  const completed = await db.liveClass.count({
    where: {
      tutorId: instructor.id,
      status: "COMPLETED",
    },
  });

  const totalCourses = instructor._count.coursesTaught + instructor._count.coTutorCourses;

  const STATUS_BADGE: Record<string, string> = {
    SCHEDULED: "badge-info",
    LIVE: "badge-warning",
    COMPLETED: "badge-success",
    CANCELLED: "badge-danger",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/tutors"
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Instructors
        </Link>
        <h1 className="text-2xl font-bold">Instructor Details</h1>
      </div>

      {/* Profile Card */}
      <div className="card mb-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
            {instructor.avatarUrl ? (
              <Image
                src={instructor.avatarUrl}
                alt={instructor.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-gray-400">
                {instructor.name.split(" ").map((n) => n[0]).join("")}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">{instructor.name}</h2>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>📧 {instructor.email}</p>
              {instructor.phone && <p>📱 {instructor.phone}</p>}
              <p>
                Joined: {new Date(instructor.createdAt).toLocaleDateString("en-UG")}
              </p>
              <p>
                Last active:{" "}
                {new Date(instructor.updatedAt).toLocaleDateString("en-UG")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{totalCourses}</p>
          <p className="text-sm text-gray-500">Courses</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{completed}</p>
          <p className="text-sm text-gray-500">Classes Held</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-600">{scheduled}</p>
          <p className="text-sm text-gray-500">Scheduled</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold">
            {completed > 0 && scheduled > 0
              ? `${Math.round((completed / (completed + scheduled)) * 100)}%`
              : "N/A"}
          </p>
          <p className="text-sm text-gray-500">Completion Rate</p>
        </div>
      </div>

      {/* Courses Taught */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Courses Taught</h3>
        {totalCourses === 0 ? (
          <p className="text-sm text-gray-500">No courses assigned.</p>
        ) : (
          <div className="space-y-2">
            {instructor.coursesTaught.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <p className="font-medium">{course.title}</p>
                  <p className="text-xs text-gray-500">{course.courseCode}</p>
                </div>
                <span className={`badge text-xs ${
                  course.status === "PUBLISHED" ? "badge-success" :
                  course.status === "DRAFT" ? "badge-warning" : "badge-danger"
                }`}>
                  {course.status}
                </span>
              </div>
            ))}
            {instructor.coTutorCourses.map(({ course }) => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <p className="font-medium">{course.title} <span className="text-xs text-gray-500">(Co-tutor)</span></p>
                  <p className="text-xs text-gray-500">{course.courseCode}</p>
                </div>
                <span className={`badge text-xs ${
                  course.status === "PUBLISHED" ? "badge-success" :
                  course.status === "DRAFT" ? "badge-warning" : "badge-danger"
                }`}>
                  {course.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Classes */}
      <div className="card">
        <h3 className="font-semibold mb-4">Recent Classes (Last 90 Days)</h3>
        {instructor.liveClasses.length === 0 ? (
          <p className="text-sm text-gray-500">No recent classes.</p>
        ) : (
          <div className="space-y-2">
            {instructor.liveClasses.map((cls) => (
              <div key={cls.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{cls.title}</p>
                  <p className="text-xs text-gray-500">{cls.course.courseCode} - {cls.course.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(cls.scheduledAt).toLocaleString("en-UG")}
                  </p>
                  {cls._count.attendance > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {cls._count.attendance} attendees
                    </p>
                  )}
                </div>
                <span className={`badge text-xs flex-shrink-0 ml-2 ${STATUS_BADGE[cls.status] || "badge-info"}`}>
                  {cls.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
