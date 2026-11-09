import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/dashboard/widgets";
import DirectMessageComposer from "@/components/dashboard/DirectMessageComposer";
import MessageInbox from "@/components/dashboard/MessageInbox";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages - Principal" };

export default async function PrincipalMessagesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "messaging.send"))
    redirect("/principal");

  // All active users except self
  const users = await db.user.findMany({
    where: { status: "ACTIVE", id: { not: session.user.id } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const recipients = users.map((u) => ({
    id: u.id,
    name: u.name ?? "Unknown",
    role: ROLE_LABELS[u.role] ?? u.role,
  }));

  // Sent messages from the audit log
  const sentLogs = await db.auditLog.findMany({
    where: {
      actorId: session.user.id,
      action: "OPERATIONAL_NOTICE_SENT",
      entityType: "Notification",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const sentMessages = sentLogs
    .map((log) => {
      const meta = log.metadata as Record<string, unknown> | null;
      return {
        id: log.id,
        recipientName: (meta?.recipientName as string) ?? "Unknown",
        subject: (meta?.subject as string) ?? "",
        body: (meta?.body as string) ?? "",
        createdAt: log.createdAt.toISOString(),
      };
    })
    .filter((m) => m.subject);

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Messages</h1>
        <p className="portal-page-subtitle">
          Send a direct message to a staff member or student. They receive it as a notification.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Inbox</h2>
        <MessageInbox />
      </section>

      <DirectMessageComposer recipients={recipients} sentMessages={sentMessages} />
    </main>
  );
}
