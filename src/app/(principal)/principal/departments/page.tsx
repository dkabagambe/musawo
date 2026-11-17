import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import DepartmentsClient from "./DepartmentsClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Departments - Principal" };

export default async function PrincipalDepartmentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: {
      head: { select: { id: true, name: true, role: true } },
      courses: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
      _count: { select: { courses: true } },
    },
  });

  // Get potential department heads (INSTRUCTOR or PRINCIPAL roles)
  const potentialHeads = await db.user.findMany({
    where: {
      role: { in: ["INSTRUCTOR", "PRINCIPAL"] },
      status: "ACTIVE",
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <DepartmentsClient
      departments={departments}
      potentialHeads={potentialHeads}
      canEdit={can(session.user.role, "courses.edit")}
    />
  );
}
