import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import StudentCreateForm from "./StudentCreateForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Create Student - Admin" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: { applicationId?: string };
}

export default async function AdminStudentCreatePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create"))
    redirect("/403");

  // If applicationId is provided, prefill from the application
  let application = null;
  if (searchParams.applicationId) {
    application = await db.application.findUnique({
      where: { id: searchParams.applicationId },
      include: {
        course: { select: { id: true, title: true, courseCode: true } },
        intake: { select: { id: true, label: true } },
      },
    });
  }

  // Get courses and intakes for the form
  const [courses, intakes, districts] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, courseCode: true },
      orderBy: { title: "asc" },
    }),
    db.intake.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, label: true },
      orderBy: { startDate: "desc" },
    }),
    db.district.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/admissions"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-3 no-underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to admissions
        </Link>
        <h1 className="text-2xl font-bold text-primary">
          {application ? "Create Student from Application" : "Register Walk-in Student"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {application
            ? `Creating account for ${application.fullName}`
            : "Register a student who applied in person or by phone"}
        </p>
      </div>

      <StudentCreateForm
        application={application}
        courses={courses}
        intakes={intakes}
        districts={districts}
      />
    </div>
  );
}
