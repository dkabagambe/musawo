"use client";

import { useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignee: { id: string; name: string } | null;
  replies: Array<{
    id: string;
    body: string;
    author: { name: string };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

interface Props {
  initialTickets: Ticket[];
}

export default function AdminSupportClient({ initialTickets }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, category }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Could not submit ticket");
      }

      setSubject("");
      setBody("");
      setCategory("GENERAL");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit ticket");
    } finally {
      setSubmitting(false);
    }
  }

  const statusColors = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Create New Ticket Button */}
      {!showForm && (
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Ticket
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* New Ticket Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">Submit New Ticket</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </p>
          )}

          <label className="label">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              required
            >
              <option value="GENERAL">General</option>
              <option value="TECHNICAL">Technical</option>
              <option value="ACADEMIC">Academic</option>
              <option value="ENROLMENT">Enrolment</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="label">
            Subject
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              minLength={3}
              maxLength={200}
              required
            />
          </label>

          <label className="label">
            Description
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input"
              rows={6}
              minLength={10}
              maxLength={3000}
              required
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tickets List */}
      {initialTickets.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No support tickets yet.</p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create First Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {initialTickets.map((ticket) => (
            <article key={ticket.id} className="card p-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.category} · {new Date(ticket.createdAt).toLocaleString("en-UG")}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>

              {/* Body */}
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                {ticket.body}
              </p>

              {/* Assignee */}
              {ticket.assignee && (
                <p className="text-xs text-gray-600 mb-3">
                  Assigned to: <span className="font-medium">{ticket.assignee.name}</span>
                </p>
              )}

              {/* Replies */}
              {ticket.replies.length > 0 && (
                <div className="space-y-3 mt-4 border-t pt-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Replies ({ticket.replies.length})
                  </p>
                  {ticket.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-900">
                          {reply.author.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(reply.createdAt).toLocaleString("en-UG")}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {reply.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
