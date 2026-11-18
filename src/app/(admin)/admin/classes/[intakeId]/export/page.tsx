import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import ExportClassList from "./ExportClassList";
export const dynamic = "force-dynamic";

export const metadata = { title: "Export Class List - Admin" };

export default async function ExportClassListPage({
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
              registrationNumber: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          user: {
            registrationNumber: "asc",
          },
        },
      },
    },
  });

  if (!intake) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/classes/${intake.id}`}
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Roster
        </Link>
        <h1 className="text-2xl font-bold">Export Class List</h1>
        <p className="text-sm text-gray-500 mt-1">
          {intake.course.courseCode} - {intake.course.title} - {intake.label}
        </p>
      </div>

      <ExportClassList
        intakeId={intake.id}
        intakeLabel={intake.label}
        courseCode={intake.course.courseCode || ""}
        students={intake.enrolments.map((e) => ({
          id: e.user.id,
          registrationNumber: e.user.registrationNumber,
          name: e.user.name,
          email: e.user.email,
          phone: e.user.phone,
          status: e.status,
        }))}
      />
    </div>
  );
}
