/**
 * /admin/support
 *
 * The Admin submits tickets to IT Admin and sees her own tickets only.
 * She does NOT handle other people's tickets.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import PageHeader from "@/components/ui/PageHeader";
import AdminSupportClient from "./AdminSupportClient";

export const metadata: Metadata = {
  title: "My Support Tickets - Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.submit"))
    redirect("/403");

  // Admin sees ONLY her own tickets
  const myTickets = await db.supportTicket.findMany({
    where: { userId: session.user.id },
    include: {
      assignee: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="My Support Tickets"
        subtitle="Submit tickets to IT Admin and track your requests"
      />
      <AdminSupportClient initialTickets={myTickets} />
    </div>
  );
}
