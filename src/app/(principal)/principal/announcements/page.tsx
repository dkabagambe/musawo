import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Announcements - Principal" };

export default async function PrincipalAnnouncementsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "announcements.send.all"))
    redirect("/principal");

  const recent = await db.auditLog.findMany({
    where: { entityType: "Announcement" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true } } },
  });

  return (
    <main className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Announcements</h1>
        <p className="portal-page-subtitle">
          Institution-wide announcements sent by you or delegated staff.
        </p>
      </div>

      {recent.length === 0 ? (
        <p className="portal-empty-state">No announcements have been logged yet.</p>
      ) : (
        <div className="portal-list">
          {recent.map((entry) => (
            <div key={entry.id} className="portal-list-item">
              <span className="portal-list-item-title">{entry.entityId}</span>
              <span className="portal-list-item-meta">
                {entry.actor?.name ?? "Unknown"} &mdash;{" "}
                {new Date(entry.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
