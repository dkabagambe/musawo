import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NotificationsClient from "./NotificationsClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications - Teaching Portal" };

export default async function TutorNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [notifications, prefs] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.notificationPref.findMany({
      where: { userId: session.user.id },
      select: { channel: true, type: true, enabled: true },
    }),
  ]);

  return (
    <NotificationsClient
      initial={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        subject: n.subject ?? null,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      }))}
      initialPrefs={prefs.map((p) => ({
        channel: p.channel,
        type: p.type,
        enabled: p.enabled,
      }))}
    />
  );
}
