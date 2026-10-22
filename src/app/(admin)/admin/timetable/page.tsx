/**
 * /admin/timetable
 *
 * Timetable and venue management for HR_SYSTEM_ADMIN.
 * HR manages timetables and venues (non-academic settings).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import PageHeader from "@/components/ui/PageHeader";
import OperationsDesk from "../OperationsDesk";

export const metadata: Metadata = {
  title: "Timetable and Venues - Admin",
};

export default async function AdminTimetablePage() {
  const session = await auth();
  if (
    !session?.user ||
    !["venues.manage", "bookings.manage", "practicals.manage"].some(
      (permission) =>
        can(session.user.role, permission as Parameters<typeof can>[1]),
    )
  )
    redirect("/403");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable and Venues"
        subtitle="Manage room bookings and practical sessions"
      />
      <OperationsDesk mode="timetable" />
    </div>
  );
}
