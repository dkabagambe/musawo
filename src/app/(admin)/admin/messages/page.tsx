/**
 * /admin/messages
 *
 * The Admin can message instructors and her students, and receive messages.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import PageHeader from "@/components/ui/PageHeader";
import AdminMessagesClient from "./AdminMessagesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages - Admin" };

export default async function AdminMessagesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "messages.send"))
    redirect("/403");

  // Get instructors and students the Admin can message
  const [instructors, students] = await Promise.all([
    db.user.findMany({
      where: { role: "INSTRUCTOR", status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.student.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Send and receive direct messages"
      />
      <AdminMessagesClient
        instructors={instructors}
        students={students.map((s) => ({
          id: s.userId,
          name: s.user.name,
          email: s.user.email,
        }))}
      />
    </main>
  );
}
