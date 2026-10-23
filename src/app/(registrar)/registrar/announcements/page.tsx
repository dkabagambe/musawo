import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const metadata = { title: "Announcements - Registrar" };

export default async function RegistrarAnnouncementsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "announcements.manage"))
    redirect("/registrar");

  const notices = await db.operationalNotice.findMany({
    orderBy: { sentAt: "desc" },
    take: 20,
    select: { id: true, title: true, audience: true, sentAt: true, sentById: true, body: true },
  });

  return (
    <main className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Announcements</h1>
        <p className="portal-page-subtitle">
          Academic announcements sent to students and staff.
        </p>
      </div>

      {notices.length === 0 ? (
        <p className="portal-empty-state">No announcements have been sent yet.</p>
      ) : (
        <div className="portal-list">
          {notices.map((n) => (
            <div key={n.id} className="portal-list-item">
              <span className="portal-list-item-title">{n.title}</span>
              <span className="portal-list-item-meta">
                {new Date(n.sentAt).toLocaleDateString("en-GB")}
                &nbsp;·&nbsp;{n.audience}
              </span>
              {n.body && (
                <span className="portal-list-item-body">{n.body}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
