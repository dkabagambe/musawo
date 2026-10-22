/**
 * /registrar/timetable
 *
 * Academic calendar and class timetable view for the Academic Registrar.
 * The Registrar manages the academic calendar and exam timetables.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Timetable - Academic Registrar",
};

export default async function RegistrarTimetablePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "classes.view")) redirect("/registrar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable and Calendar"
        subtitle="Academic calendar, class schedule and exam timetables"
      />
      <div className="card p-6">
        <p className="text-sm text-gray-500">
          Timetable management coming in Batch E. The academic calendar, class groups and exam
          timetables will be managed here once the timetable module is complete.
        </p>
      </div>
    </div>
  );
}
