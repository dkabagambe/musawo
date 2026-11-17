import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ClassesClient from "./ClassesClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Classes & Groups - Principal" };

export default async function PrincipalClassesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  // Fetch all courses with their intakes and enrolments
  const courses = await db.course.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { title: "asc" },
    include: {
      tutor: { select: { id: true, name: true } },
      coTutors: {
        include: {
          tutor: { select: { id: true, name: true } },
        },
      },
      intakes: {
        orderBy: { startDate: "desc" },
        include: {
          enrolments: {
            where: { status: { not: "CANCELLED" } },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Get all active students for assignment
  const students = await db.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      studentNumber: true,
      avatarUrl: true,
    },
  });

  // Get all instructors for assignment
  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return (
    <ClassesClient
      courses={courses}
      students={students}
      instructors={instructors}
      canEdit={can(session.user.role, "courses.edit")}
    />
  );
}
