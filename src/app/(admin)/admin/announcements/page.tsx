/**
 * /admin/announcements
 *
 * Unified page for administrative announcements and operational notices.
 * - Operational notices (class moved, room changed, office closed): sent immediately
 * - Institution-wide announcements: require Principal approval
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import PageHeader from "@/components/ui/PageHeader";
import AnnouncementsClient from "./AnnouncementsClient";

export const metadata: Metadata = {
  title: "Announcements - Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "announcements.create"))
    redirect("/403");

  // Fetch courses and intakes for targeting
  const [courses, intakes, announcements] = await Promise.all([
    db.course.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, code: true },
      orderBy: { code: "asc" },
    }),
    db.intake.findMany({
      where: { current: true },
      select: { id: true, year: true, semester: true },
      orderBy: [{ year: "desc" }, { semester: "desc" }],
    }),
    db.announcement.findMany({
      where: { createdById: session.user.id },
      include: {
        createdBy: { select: { name: true } },
        targetCourse: { select: { code: true } },
        targetIntake: { select: { year: true, semester: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Create administrative announcements and operational notices"
      />
      <AnnouncementsClient
        courses={courses}
        intakes={intakes}
        initialAnnouncements={announcements}
      />
    </div>
  );
}
