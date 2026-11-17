import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ProgrammesClient from "./ProgrammesClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Academic Programmes - Principal" };

export default async function PrincipalProgrammesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const courses = await db.course.findMany({
    orderBy: { title: "asc" },
    include: {
      tutor: { select: { name: true } },
      enrolments: { select: { id: true } },
      intakes: { where: { isOpen: true }, select: { id: true, label: true } },
      departments: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
  });

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ProgrammesClient
      courses={courses}
      departments={departments}
      canEdit={can(session.user.role, "courses.edit")}
      canPublish={can(session.user.role, "courses.publish")}
    />
  );
}
