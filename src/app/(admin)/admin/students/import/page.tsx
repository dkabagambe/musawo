import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CSVImportForm from "./CSVImportForm";

export const metadata = { title: "Import Students - Admin" };
export const dynamic = "force-dynamic";

export default async function ImportStudentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create"))
    redirect("/403");

  // Get courses and intakes for validation
  const [courses, intakes] = await Promise.all([
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
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-3 no-underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to students
        </Link>
        <h1 className="text-2xl font-bold text-primary">Import Students from CSV</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bulk register students from a CSV file
        </p>
      </div>

      <div className="card bg-info/10 border-info/20">
        <h2 className="font-semibold text-sm mb-3">CSV Format Requirements</h2>
        <div className="text-xs text-gray-600 space-y-2">
          <p className="font-medium">Required columns (exact names):</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>fullName - Full name as on ID</li>
            <li>email - Valid email address (unique)</li>
            <li>phone - Phone number with country code</li>
            <li>courseCode - Course code (e.g., MHC, BHC, BCS)</li>
            <li>intakeLabel - Intake label (e.g., 2026 Intake 1)</li>
            <li>dateOfBirth - Format: YYYY-MM-DD</li>
            <li>gender - Male, Female, or Other</li>
          </ul>
          <p className="font-medium mt-3">Optional columns:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>district - District name</li>
            <li>highestQualification - Highest education level</li>
            <li>professionalTitle - For professional category only</li>
            <li>professionalRegistrationNumber - For professionals</li>
            <li>emergencyContact - Emergency contact details</li>
            <li>category - REGULAR, PROFESSIONAL, or INTERNATIONAL (default: REGULAR)</li>
          </ul>
        </div>
      </div>

      <CSVImportForm courses={courses} intakes={intakes} />

      <div className="card">
        <h2 className="font-semibold text-sm mb-3">Import Process</h2>
        <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600">
          <li>Upload CSV file (maximum 100 students per batch)</li>
          <li>System validates each row (duplicates, format, required fields)</li>
          <li>Review validation results and errors</li>
          <li>Confirm to create student accounts</li>
          <li>Registration numbers generated automatically per course</li>
          <li>Approval requests created for Principal</li>
          <li>After approval, students receive invitation emails</li>
        </ol>
      </div>

      <div className="card bg-warning/10 border-warning/20">
        <h2 className="font-semibold text-sm mb-2 text-warning">Important Notes</h2>
        <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
          <li>Duplicate emails or phone numbers will be rejected</li>
          <li>Invalid course codes or intake labels will cause errors</li>
          <li>Date format must be YYYY-MM-DD (e.g., 2000-01-15)</li>
          <li>All students will be set to PENDING status initially</li>
          <li>Principal approval required before accounts become active</li>
        </ul>
      </div>
    </div>
  );
}
