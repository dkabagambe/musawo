"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  user: { id: string; name: string; email: string | null };
  assignee: { id: string; name: string } | null;
  replies: Array<{
    id: string;
    body: string;
    author: { name: string };
    createdAt: string;
  }>;
  createdAt: string;
};

const FILTERS = ["OPEN", "MINE", "WAITING", "CLOSED"] as const;

export default function SupportDesk() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("OPEN");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load support tickets.");
      const result = (await response.json()) as {
        tickets: Ticket[];
        viewerId?: string;
      };
      setTickets(result.tickets);
      setViewerId(result.viewerId ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load support tickets.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function updateTicket(
    ticketId: string,
    action: "assign" | "reply" | "status",
    values: Record<string, string>,
  ) {
    const response = await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, action, ...values }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "The ticket could not be updated.");
      return;
    }
    setReplies((current) => ({ ...current, [ticketId]: "" }));
    await loadTickets();
  }

  const visibleTickets = tickets.filter((ticket) => {
    if (filter === "CLOSED")
      return ticket.status === "CLOSED" || ticket.status === "RESOLVED";
    if (filter === "MINE") return ticket.assignee?.id === viewerId;
    if (filter === "WAITING")
      return ticket.status === "OPEN" && ticket.replies.length > 0;
    return ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Support ticket filter"
        >
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={`rounded-md border px-3 py-2 text-sm ${filter === value ? "border-primary bg-primary text-white" : "border-border bg-white text-gray-700"}`}
              onClick={() => setFilter(value)}
            >
              {value === "MINE"
                ? "Mine"
                : value === "WAITING"
                  ? "Waiting"
                  : value[0] + value.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2"
          onClick={() => void loadTickets()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading tickets...</p>
      ) : null}
      {!loading && visibleTickets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-white p-8 text-center">
          <MessageSquare
            className="mx-auto mb-2 h-5 w-5 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-gray-800">
            No tickets in this view
          </p>
        </div>
      ) : null}
      <div className="space-y-3">
        {visibleTickets.map((ticket) => (
          <article
            key={ticket.id}
            className="rounded-md border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-gray-900">
                  {ticket.subject}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {ticket.user.name} · {ticket.category} ·{" "}
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                {ticket.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
              {ticket.body}
            </p>
            {ticket.replies.map((reply) => (
              <div
                key={reply.id}
                className="mt-3 border-l-2 border-teal-200 pl-3"
              >
                <p className="text-xs font-medium text-gray-600">
                  {reply.author.name}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {reply.body}
                </p>
              </div>
            ))}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() =>
                  void updateTicket(ticket.id, "assign", { assignedTo: "me" })
                }
              >
                {ticket.assignee
                  ? `Assigned to ${ticket.assignee.name}`
                  : "Assign to me"}
              </button>
              <select
                aria-label={`Status for ${ticket.subject}`}
                className="input max-w-44 text-sm"
                value={ticket.status}
                onChange={(event) =>
                  void updateTicket(ticket.id, "status", {
                    status: event.target.value,
                  })
                }
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const body = replies[ticket.id]?.trim();
                if (body) void updateTicket(ticket.id, "reply", { body });
              }}
            >
              <input
                className="input min-w-0 flex-1"
                value={replies[ticket.id] ?? ""}
                onChange={(event) =>
                  setReplies((current) => ({
                    ...current,
                    [ticket.id]: event.target.value,
                  }))
                }
                placeholder="Reply to requester"
                aria-label={`Reply to ${ticket.subject}`}
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-2"
                disabled={!replies[ticket.id]?.trim()}
              >
                <Send className="h-4 w-4" aria-hidden="true" /> Reply
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
