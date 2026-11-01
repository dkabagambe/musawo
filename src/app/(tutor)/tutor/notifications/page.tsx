import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Notifications - Teaching Portal" };

export default async function TutorNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  const TYPE_ICON: Record<string, string> = {
    CLASS_REMINDER: "📅",
    MARKS_CHANGE:   "📝",
    SYSTEM_ALERT:   "⚠️",
    ANNOUNCEMENT:   "📢",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action="/api/notifications/mark-all-read" method="POST">
            <button type="submit" className="btn-outline text-sm">Mark all read</button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-3xl mb-3">🔔</p>
          <p className="text-gray-400 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start gap-4 ${!n.readAt ? "border-primary/20 bg-primary/5" : ""}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                {n.subject && <p className="font-semibold text-sm text-primary">{n.subject}</p>}
                <p className="text-sm text-gray-700 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString("en-UG")}
                  {!n.readAt && <span className="ml-2 font-semibold text-primary">New</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
