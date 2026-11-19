import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import ITTicketDetail from "./ITTicketDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support Ticket - IT Admin" };

export default async function ITSupportTicketPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");

  const ticket = await db.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      assignee: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!ticket) notFound();

  // Tech profile (no business data)
  const userForProfile = await db.user.findUnique({
    where: { id: ticket.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      totpEnabled: true,
      sessions: {
        where: { expires: { gt: new Date() } },
        select: { id: true, expires: true },
      },
    },
  });

  const roleLabels: Record<string, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    ADMIN: "Admin",
    PRINCIPAL: "Principal",
    DIRECTOR: "Director",
    ACADEMIC_REGISTRAR: "Academic Registrar",
    SYSTEM_IT: "IT Admin",
  };

  const techProfile = userForProfile
    ? {
        id: userForProfile.id,
        name: userForProfile.name ?? "",
        email: userForProfile.email,
        role: userForProfile.role,
        roleLabel: roleLabels[userForProfile.role] ?? userForProfile.role,
        status: userForProfile.status,
        joinedAt: userForProfile.createdAt.toISOString(),
        totpEnabled: userForProfile.totpEnabled ?? false,
        activeSessionCount: userForProfile.sessions.length,
      }
    : null;

  const viewerId = session.user.id;
  const statusColour: Record<string, string> = {
    OPEN: "bg-amber-100 text-amber-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-700",
  };
  const priorityColour: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    NORMAL: "bg-blue-50 text-blue-700",
    HIGH: "bg-orange-100 text-orange-800",
    URGENT: "bg-red-100 text-red-800",
  };

  const serialized = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null,
    replies: ticket.replies.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/system/support" className="text-sm text-accent hover:underline mb-3 inline-block">
          &larr; Back to support tickets
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-primary leading-tight">{ticket.subject}</h1>
            <p className="text-xs text-gray-400 mt-1">
              {ticket.category} &middot; Opened{" "}
              {ticket.createdAt.toLocaleDateString("en-UG", { dateStyle: "medium" })}
              {ticket.assignee && ` · Assigned to ${ticket.assignee.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColour[ticket.status] ?? ""}`}>
              {ticket.status.replace("_", " ")}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColour[ticket.priority] ?? ""}`}>
              {ticket.priority}
            </span>
          </div>
        </div>
      </div>

      <ITTicketDetail
        ticket={serialized}
        techProfile={techProfile}
        viewerId={viewerId}
      />
    </div>
  );
}
