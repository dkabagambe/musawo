/**
 * /admin/reports
 *
 * Comprehensive reports for the Admin with filters and export capabilities.
 */

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import PageHeader from "@/components/ui/PageHeader";
import AdminReportsClient from "./AdminReportsClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reports - Admin" };

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.operational"))
    redirect("/403");

  // Get filter options
  const [courses, intakes] = await Promise.all([
    db.course.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, code: true },
      orderBy: { code: "asc" },
    }),
    db.intake.findMany({
      select: { id: true, year: true, semester: true },
      orderBy: [{ year: "desc" }, { semester: "desc" }],
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Student lists, attendance, results, and operational summaries"
      />
      <AdminReportsClient courses={courses} intakes={intakes} />
    </div>
  );
}
