import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import TicketReplyForm from "./TicketReplyForm";
export const dynamic = "force-dynamic";

export const metadata = { title: "Support Ticket" };

export default async function SupportTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ticket = await db.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true } },
      assignee: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!ticket) notFound();

  // Users can only see their own tickets; managers can see all
  const isOwner = ticket.userId === session.user.id;
  const isManager =
    session.user.role === "SYSTEM_IT" ||
    session.user.role === "ADMIN" ||
    session.user.role === "PRINCIPAL" ||
    session.user.role === "DIRECTOR";

  if (!isOwner && !isManager) notFound();

  const backHref =
    session.user.role === "INSTRUCTOR"
      ? "/tutor/support"
      : session.user.role === "STUDENT"
        ? "/dashboard/support"
        : "/admin/support";

  const statusColour: Record<string, string> = {
    OPEN: "badge-warning",
    IN_PROGRESS: "badge-info",
    RESOLVED: "badge-success",
    CLOSED: "badge",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href={backHref} className="text-sm text-accent no-underline hover:underline mb-3 inline-block">
          &larr; Back to support
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-primary">{ticket.subject}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {ticket.category} &middot; Opened{" "}
              {new Date(ticket.createdAt).toLocaleDateString("en-UG", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              {ticket.assignee && ` · Assigned to ${ticket.assignee.name}`}
            </p>
          </div>
          <span className={`badge text-xs flex-shrink-0 ${statusColour[ticket.status] ?? "badge"}`}>
            {ticket.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Original message */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {ticket.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{ticket.user.name}</p>
            <p className="text-xs text-gray-400">
              {new Date(ticket.createdAt).toLocaleString("en-UG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.body}</p>
      </div>

      {/* Replies */}
      {ticket.replies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Replies ({ticket.replies.length})
          </h2>
          {ticket.replies.map((reply) => (
            <div
              key={reply.id}
              className={`card ${reply.isStaff ? "border-l-4 border-l-primary/30 bg-primary/5" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${reply.isStaff ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>
                  {reply.author.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {reply.author.name}
                    {reply.isStaff && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Support</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(reply.createdAt).toLocaleString("en-UG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form - only the owner can reply, and only if not closed */}
      {isOwner && ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && (
        <TicketReplyForm ticketId={ticket.id} />
      )}

      {(ticket.status === "CLOSED" || ticket.status === "RESOLVED") && (
        <div className="card bg-gray-50 text-center py-6">
          <p className="text-sm text-gray-500">
            This ticket is {ticket.status.toLowerCase()}. If you need further help,{" "}
            <Link href={backHref} className="text-accent no-underline hover:underline">
              open a new ticket
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
