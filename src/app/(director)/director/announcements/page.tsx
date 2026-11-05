import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import SiteAnnouncementComposer from "@/components/dashboard/SiteAnnouncementComposer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Announcements - Director" };

export default async function DirectorAnnouncementsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "announcements.send.all"))
    redirect("/director");

  const announcements = await db.announcement.findMany({
    where: { courseId: null },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: { author: { select: { name: true } } },
  });

  const initial = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    createdAt: a.createdAt.toISOString(),
    authorName: a.author?.name ?? undefined,
  }));

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Announcements</h1>
        <p className="portal-page-subtitle">
          Send institution-wide announcements. Every active user receives a notification.
        </p>
      </div>
      <SiteAnnouncementComposer initial={initial} />
    </main>
  );
}
