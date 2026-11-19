"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

type Reply = {
  id: string;
  body: string;
  author: { id: string; name: string; role: string };
  createdAt: string;
  isStaff: boolean;
  isInternal: boolean;
};

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: string;
  priority: string;
  user: { id: string; name: string; email: string | null; role: string };
  assignee: { id: string; name: string } | null;
  replies: Reply[];
  createdAt: string;
  firstResponseAt: string | null;
  resolutionSummary: string | null;
  fileS3Key: string | null;
};

type TechProfile = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  roleLabel: string;
  status: string;
  joinedAt: string;
  totpEnabled: boolean;
  activeSessionCount: number;
} | null;

type Props = {
  ticket: Ticket;
  techProfile: TechProfile;
  viewerId: string;
};

export default function ITTicketDetail({ ticket, techProfile, viewerId }: Props) {
  const router = useRouter();
  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  const isOpen = ticket.status !== "CLOSED" && ticket.status !== "RESOLVED";

  async function sendReply() {
    if (!replyBody.trim()) return;
    setSending(true);
    setReplyError("");
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          action: "reply",
          body: replyBody.trim(),
          isInternal,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setReplyError(d.error ?? "Reply failed");
        return;
      }
      setReplyBody("");
      setIsInternal(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (!resolutionSummary.trim() || resolutionSummary.trim().length < 5) {
      setCloseError("Resolution summary must be at least 5 characters.");
      return;
    }
    setClosing(true);
    setCloseError("");
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          action: "close",
          resolutionSummary: resolutionSummary.trim(),
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setCloseError(d.error ?? "Could not close ticket");
        return;
      }
      setShowCloseModal(false);
      router.refresh();
    } finally {
      setClosing(false);
    }
  }

  async function assign(to: "me" | null) {
    await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, action: "assign", assignedTo: to === "me" ? "me" : null }),
    });
    router.refresh();
  }

  async function changeStatus(status: string) {
    if (status === "CLOSED") {
      setShowCloseModal(true);
      setCloseError("");
      return;
    }
    await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, action: "status", status }),
    });
    router.refresh();
  }

  async function changePriority(priority: string) {
    await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, action: "priority", priority }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main thread */}
        <div className="flex-1 space-y-4">
          {/* Original message */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {(ticket.user.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{ticket.user.name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(ticket.createdAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.body}</p>
            {ticket.fileS3Key && (
              <p className="text-xs text-gray-400 mt-2">Attachment uploaded (view from IT console)</p>
            )}
          </div>

          {/* Replies */}
          {ticket.replies.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Thread ({ticket.replies.length})
              </h2>
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`card ${
                    reply.isInternal
                      ? "bg-yellow-50 border-yellow-200"
                      : reply.isStaff
                        ? "border-l-4 border-l-primary/30 bg-primary/5"
                        : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${reply.isStaff ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>
                      {reply.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold">{reply.author.name}</span>
                        {reply.isInternal && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Internal note</span>
                        )}
                        {reply.isStaff && !reply.isInternal && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Support</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(reply.createdAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Resolution summary */}
          {ticket.resolutionSummary && (
            <div className="card bg-green-50 border-green-200">
              <p className="text-xs font-semibold text-green-700 mb-1">Resolution summary</p>
              <p className="text-sm text-green-800 whitespace-pre-wrap">{ticket.resolutionSummary}</p>
            </div>
          )}

          {/* Reply form */}
          {isOpen && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold">Add reply or internal note</h3>
              {replyError && (
                <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{replyError}</p>
              )}
              <textarea
                rows={4}
                className="input w-full resize-y text-sm"
                placeholder={isInternal ? "Internal note (only visible to IT Admin staff)..." : "Reply to the user..."}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                maxLength={3000}
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <span className={`font-medium ${isInternal ? "text-yellow-700" : "text-gray-500"}`}>
                    Internal note (not visible to user)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={!replyBody.trim() || sending}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isInternal ? "Save note" : "Send reply"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-64 space-y-4 flex-shrink-0">
          {/* Actions */}
          <div className="card space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</p>

            <div>
              <label className="label text-xs">Status</label>
              <select
                className="input text-sm w-full"
                value={ticket.status}
                onChange={(e) => void changeStatus(e.target.value)}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Close (requires summary)</option>
              </select>
            </div>

            <div>
              <label className="label text-xs">Priority</label>
              <select
                className="input text-sm w-full"
                value={ticket.priority}
                onChange={(e) => void changePriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <p className="label text-xs mb-1">Assignment</p>
              {ticket.assignee ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{ticket.assignee.id === viewerId ? "Assigned to me" : ticket.assignee.name}</span>
                  <button type="button" onClick={() => void assign(null)} className="text-xs text-gray-400 hover:text-gray-600">Unassign</button>
                </div>
              ) : (
                <button type="button" onClick={() => void assign("me")} className="btn-secondary text-sm w-full">
                  Assign to me
                </button>
              )}
            </div>
          </div>

          {/* Tech profile */}
          {techProfile && (
            <div className="card space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User technical profile</p>
              <p className="text-xs text-blue-600 italic">No business data shown</p>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-right">{techProfile.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-right break-all">{techProfile.email ?? "none"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Role</dt>
                  <dd>{techProfile.roleLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Status</dt>
                  <dd className={`font-medium ${techProfile.status === "ACTIVE" ? "text-green-700" : "text-red-600"}`}>
                    {techProfile.status}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">2FA</dt>
                  <dd className={techProfile.totpEnabled ? "text-green-700 font-medium" : "text-amber-600 font-medium"}>
                    {techProfile.totpEnabled ? "Enabled" : "Not enrolled"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Sessions</dt>
                  <dd>{techProfile.activeSessionCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Joined</dt>
                  <dd>{new Date(techProfile.joinedAt).toLocaleDateString("en-UG", { dateStyle: "medium" })}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Ticket metadata */}
          <div className="card space-y-1.5 text-xs">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ticket info</p>
            <p className="text-gray-500">Category: <span className="font-medium text-gray-700">{ticket.category}</span></p>
            <p className="text-gray-500">First response: <span className="font-medium text-gray-700">{ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" }) : "Not yet"}</span></p>
            <p className="text-gray-500">Replies: <span className="font-medium text-gray-700">{ticket.replies.filter((r) => !r.isInternal).length} public, {ticket.replies.filter((r) => r.isInternal).length} internal</span></p>
          </div>
        </div>
      </div>

      {/* Close modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full space-y-4">
            <h2 className="font-semibold">Close ticket</h2>
            <p className="text-sm text-gray-500">{ticket.subject}</p>
            {closeError && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{closeError}</p>}
            <div>
              <label className="label">
                Resolution summary <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className="input w-full resize-none"
                placeholder="Briefly describe how this was resolved..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">{resolutionSummary.length} chars (minimum 5)</p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-ghost flex-1" onClick={() => setShowCloseModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => void handleClose()}
                disabled={closing || resolutionSummary.trim().length < 5}
              >
                {closing && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
                Close ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
