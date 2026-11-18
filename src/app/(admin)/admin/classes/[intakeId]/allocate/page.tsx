import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import AllocateStudentsForm from "./AllocateStudentsForm";
export const dynamic = "force-dynamic";

export const metadata = { title: "Allocate Students - Admin" };

export default async function AllocateStudentsPage({
  params,
}: {
  params: { intakeId: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create")) redirect("/403");

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
      _count: {
        select: { enrolments: true },
      },
    },
  });

  if (!intake) notFound();

  // Get students not yet enrolled in this intake
  const availableStudents = await db.user.findMany({
    where: {
      role: "STUDENT",
      enrolments: {
        none: {
          intakeId: intake.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      registrationNumber: true,
    },
    orderBy: { name: "asc" },
    take: 200, // Limit for performance
  });

  // Get currently enrolled students
  const enrolled = await db.enrolment.findMany({
    where: { intakeId: intake.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: { name: "asc" },
    },
  });

  const availableSeats = intake.seats - intake._count.enrolments;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/classes/${intake.id}`}
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Roster
        </Link>
        <h1 className="text-2xl font-bold">Allocate Students</h1>
        <p className="text-sm text-gray-500 mt-1">
          {intake.course.courseCode} - {intake.course.title} - {intake.label}
        </p>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-gray-500">
            {intake._count.enrolments} / {intake.seats} enrolled
          </span>
          {availableSeats > 0 ? (
            <span className="text-green-600">{availableSeats} seats available</span>
          ) : (
            <span className="text-red-600">Class full</span>
          )}
        </div>
      </div>

      <AllocateStudentsForm
        intakeId={intake.id}
        courseId={intake.course.id}
        availableStudents={availableStudents}
        enrolledStudents={enrolled}
        availableSeats={availableSeats}
      />
    </div>
  );
}
