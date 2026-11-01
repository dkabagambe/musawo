import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Notifications - Admin" };

interface Props {
  searchParams: { unread?: string };
}

export default async function AdminNotificationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const showUnread = searchParams.unread === "1";

  const notifications = await db.notification.findMany({
    where: {
      userId: session.user.id,
      ...(showUnread ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-warning mt-1">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={showUnread ? "/admin/notifications" : "/admin/notifications?unread=1"}
            className="btn-outline text-sm no-underline"
          >
            {showUnread ? "Show all" : `Unread (${unreadCount})`}
          </Link>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">🔔</p>
          <p className="text-gray-500 text-sm">
            {showUnread ? "No unread notifications." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card ${!n.readAt ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {n.subject && (
                    <p className="font-semibold text-sm">{n.subject}</p>
                  )}
                  <p className="text-sm text-gray-700 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("en-UG")}
                  </p>
                </div>
                {!n.readAt && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" aria-label="Unread" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
