import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import SemestersClient from "./SemestersClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Terms (Academic Years & Semesters) - Principal" };

export default async function PrincipalSemestersPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  // Intakes serve as the semester/intake period equivalent
  const intakes = await db.intake.findMany({
    orderBy: [{ isOpen: "desc" }, { startDate: "desc" }],
    include: {
      course: { select: { id: true, title: true, courseCode: true } },
      _count: { select: { enrolments: true, applications: true } },
    },
  });

  const courses = await db.course.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, courseCode: true },
  });

  return (
    <SemestersClient
      intakes={intakes}
      courses={courses}
      canEdit={can(session.user.role, "courses.edit")}
    />
  );
}
