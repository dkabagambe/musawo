import { auth } from "@/lib/auth/server";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Users } from "lucide-react";
import TutorStudentsClient from "./TutorStudentsClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Students" };

export default async function TutorStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "students.view")) redirect("/403");

  const enrolments = await db.enrolment.findMany({
    where: {
      status: { in: ["ACTIVE", "COMPLETED"] },
      user: { role: "STUDENT" },
      course: teachingCourseWhere(session.user.id),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          studentNumber: true,
          avatarUrl: true,
          role: true,
        },
      },
      course: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by course
  type EnrRow = (typeof enrolments)[number];
  const byCourse: Record<string, EnrRow[]> = {};
  for (const e of enrolments) {
    const key = `${e.courseId}::${e.course.title}`;
    if (!byCourse[key]) byCourse[key] = [];
    byCourse[key].push(e);
  }

  const groups = Object.entries(byCourse).map(([key, rows]) => ({
    courseTitle: key.split("::")[1],
    rows: rows.map((e) => ({
      id: e.id,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      user: {
        id: e.user.id,
        name: e.user.name,
        email: e.user.email ?? null,
        phone: e.user.phone ?? null,
        studentNumber: e.user.studentNumber ?? null,
        avatarUrl: e.user.avatarUrl ?? null,
        role: e.user.role,
      },
    })),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Students</h1>
        <p className="text-gray-500 text-sm mt-1">
          {enrolments.length} enrolled student{enrolments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {enrolments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-gray-500 text-sm">No students enrolled in your courses yet.</p>
        </div>
      ) : (
        <TutorStudentsClient
          currentUserId={session.user.id}
          groups={groups}
        />
      )}
    </div>
  );
}
