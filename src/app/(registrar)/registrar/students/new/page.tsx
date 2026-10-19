import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import CreateStudentForm from "../CreateStudentForm";

export const metadata = { title: "Create Student Account - Registrar" };

export default async function NewStudentPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create")) redirect("/dashboard");

  const [courses, intakes] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, category: true },
      orderBy: { title: "asc" },
    }),
    db.intake.findMany({
      where: { isOpen: true },
      select: { id: true, label: true, courseId: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/registrar/students" className="text-xs text-accent no-underline hover:underline">
          &larr; Back to students
        </Link>
        <h1 className="text-2xl font-bold text-primary mt-1">Create student account</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fill in the student&apos;s details as they appear on their ID. An invite link will be emailed so they can set a password.
        </p>
      </div>

      <CreateStudentForm courses={courses} intakes={intakes} />
    </div>
  );
}
