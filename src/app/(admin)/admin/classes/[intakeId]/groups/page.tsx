import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import BreakawayGroupsManager from "./BreakawayGroupsManager";
export const dynamic = "force-dynamic";

export const metadata = { title: "Breakaway Groups - Admin" };

export default async function BreakawayGroupsPage({
  params,
}: {
  params: { intakeId: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const intake = await db.intake.findUnique({
    where: { id: params.intakeId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      enrolments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
            },
          },
        },
        orderBy: {
          user: { name: "asc" },
        },
      },
    },
  });

  if (!intake) notFound();

  const students = intake.enrolments.map((e) => ({
    id: e.user.id,
    name: e.user.name,
    registrationNumber: e.user.registrationNumber,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/classes/${intake.id}`}
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Roster
        </Link>
        <h1 className="text-2xl font-bold">Breakaway Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          {intake.course.courseCode} - {intake.course.title} - {intake.label}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Default group size: 5 students
        </p>
      </div>

      <BreakawayGroupsManager intakeId={intake.id} students={students} />
    </div>
  );
}
