"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Tag,
  User,
  X,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlaStatus = "ok" | "warning" | "overdue" | "met";

type Reply = {
  id: string;
  body: string;
  author: { id: string; name: string };
  createdAt: string;
  isStaff: boolean;
  isInternal: boolean;
};

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  user: { id: string; name: string; email: string | null; role: string };
  assignee: { id: string; name: string } | null;
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolutionSummary: string | null;
  fileS3Key: string | null;
  slaStatus: SlaStatus;
  timeRemainingMinutes: number | null;
};

type CannedReply = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  sortOrder: number;
};

type UserProfile = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  roleLabel: string;
  status: string;
  joinedAt: string;
  totpEnabled: boolean;
  activeSessionCount: number;
  lastActive: string | null;
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-50 text-blue-700",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const SLA_BADGE: Record<SlaStatus, { className: string; icon: React.ReactNode; label: (mins: number | null) => string }> = {
  ok: { className: "text-green-600", icon: <Clock className="w-3.5 h-3.5" />, label: (m) => m != null ? `${formatMinutes(m)} left` : "On time" },
  warning: { className: "text-amber-600", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: (m) => m != null ? `${formatMinutes(m)} left` : "Due soon" },
  overdue: { className: "text-red-600", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: (m) => m != null ? `${formatMinutes(Math.abs(m))} overdue` : "Overdue" },
  met: { className: "text-green-500", icon: <CheckCircle className="w-3.5 h-3.5" />, label: () => "Responded" },
};

function formatMinutes(mins: number): string {
  const absM = Math.abs(mins);
  if (absM < 60) return `${absM}m`;
  const h = Math.floor(absM / 60);
  const m = absM % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ITSupportDesk() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("OPEN_ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Reply state
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [isInternal, setIsInternal] = useState<Record<string, boolean>>({});
  const [replying, setReplying] = useState<string | null>(null);

  // Close modal
  const [closeModal, setCloseModal] = useState<{ id: string; subject: string } | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [closing, setClosing] = useState(false);

  // Canned replies
  const [cannedReplies, setCannedReplies] = useState<CannedReply[]>([]);
  const [showCanned, setShowCanned] = useState<string | null>(null);

  // User profile panel
  const [profileTicketId, setProfileTicketId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Reports
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<Record<string, unknown> | null>(null);

  // Manage canned replies
  const [showManageCanned, setShowManageCanned] = useState(false);
  const [newCannedTitle, setNewCannedTitle] = useState("");
  const [newCannedBody, setNewCannedBody] = useState("");
  const [savingCanned, setSavingCanned] = useState(false);

  // ─── Data loading ─────────────────────────────────────────────

  const loadTickets = useCallback(async (pg = page) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        assignee: assigneeFilter,
        sort: sortBy,
        page: String(pg),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/support?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load tickets");
      const data = (await res.json()) as {
        tickets: Ticket[];
        viewerId: string;
        total: number;
        page: number;
        totalPages: number;
      };
      setTickets(data.tickets);
      setViewerId(data.viewerId);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, assigneeFilter, sortBy, search, page]);

  useEffect(() => {
    void loadTickets(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, priorityFilter, assigneeFilter, sortBy, search]);

  useEffect(() => {
    void loadTickets(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    // Load canned replies
    fetch("/api/support/canned-replies")
      .then((r) => r.json())
      .then((d: { replies: CannedReply[] }) => setCannedReplies(d.replies ?? []))
      .catch(() => null);
  }, []);

  function handleSearchInput(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  }

  // ─── Actions ──────────────────────────────────────────────────

  async function sendReply(ticketId: string) {
    const body = replyBody[ticketId]?.trim();
    if (!body) return;
    setReplying(ticketId);
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          action: "reply",
          body,
          isInternal: isInternal[ticketId] ?? false,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Reply failed");
        return;
      }
      setReplyBody((prev) => ({ ...prev, [ticketId]: "" }));
      setIsInternal((prev) => ({ ...prev, [ticketId]: false }));
      await loadTickets(page);
    } finally {
      setReplying(null);
    }
  }

  async function updateStatus(ticketId: string, status: string) {
    await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, action: "status", status }),
    });
    await loadTickets(page);
  }

  async function updatePriority(ticketId: string, priority: string) {
    await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, action: "priority", priority }),
    });
    await loadTickets(page);
  }

  async function assignToMe(ticketId: string) {
    await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, action: "assign", assignedTo: "me" }),
    });
    await loadTickets(page);
  }

  async function handleClose() {
    if (!closeModal) return;
    if (!resolutionSummary.trim() || resolutionSummary.trim().length < 5) {
      setError("Resolution summary must be at least 5 characters.");
      return;
    }
    setClosing(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: closeModal.id,
          action: "close",
          resolutionSummary: resolutionSummary.trim(),
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Could not close ticket");
        return;
      }
      setCloseModal(null);
      setResolutionSummary("");
      await loadTickets(page);
    } finally {
      setClosing(false);
    }
  }

  async function loadUserProfile(ticketId: string) {
    if (profileTicketId === ticketId) {
      setProfileTicketId(null);
      setUserProfile(null);
      return;
    }
    setProfileTicketId(ticketId);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/support/${ticketId}/user-profile`);
      const d = (await res.json()) as UserProfile;
      setUserProfile(d);
    } catch {
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadReports() {
    setShowReports(true);
    const res = await fetch("/api/support/reports");
    const d = (await res.json()) as Record<string, unknown>;
    setReports(d);
  }

  async function saveCannedReply() {
    if (!newCannedTitle.trim() || !newCannedBody.trim()) return;
    setSavingCanned(true);
    try {
      const res = await fetch("/api/support/canned-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newCannedTitle.trim(), body: newCannedBody.trim() }),
      });
      if (res.ok) {
        const d = (await res.json()) as { reply: CannedReply };
        setCannedReplies((prev) => [...prev, d.reply]);
        setNewCannedTitle("");
        setNewCannedBody("");
      }
    } finally {
      setSavingCanned(false);
    }
  }

  async function deleteCannedReply(id: string) {
    await fetch("/api/support/canned-replies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    setCannedReplies((prev) => prev.filter((r) => r.id !== id));
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            className="input pl-9 text-sm"
            placeholder="Search subject, user, body..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400" />

          <select className="input text-sm max-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="OPEN_ACTIVE">Open &amp; in progress</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select className="input text-sm max-w-[130px]" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="ALL">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <select className="input text-sm max-w-[130px]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All categories</option>
            <option value="GENERAL">General</option>
            <option value="ACADEMIC">Academic</option>
            <option value="TECHNICAL">Technical</option>
            <option value="ENROLMENT">Enrolment</option>
            <option value="TIMETABLE">Timetable</option>
            <option value="ACCOUNT_ACCESS">Account access</option>
            <option value="FRONT_DESK">Front desk</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="OTHER">Other</option>
          </select>

          <select className="input text-sm max-w-[130px]" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="ALL">All assignees</option>
            <option value="me">Mine</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <select className="input text-sm max-w-[130px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
            <option value="updated">Last updated</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={() => void loadReports()}
            className="btn-ghost text-sm"
          >
            Reports
          </button>
          <button
            type="button"
            onClick={() => setShowManageCanned(true)}
            className="btn-ghost text-sm"
          >
            Canned replies
          </button>
          <button
            type="button"
            onClick={() => void loadTickets(page)}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{total} ticket{total !== 1 ? "s" : ""}</span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading tickets...
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm font-medium">No tickets match your filters.</p>
        </div>
      )}

      {/* Ticket list */}
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const isExpanded = expanded === ticket.id;
          const slaInfo = SLA_BADGE[ticket.slaStatus];
          const visibleReplies = ticket.replies.filter((r) => !r.isInternal);
          const internalNotes = ticket.replies.filter((r) => r.isInternal);

          return (
            <article key={ticket.id} className={`rounded-xl border bg-white shadow-sm overflow-hidden ${ticket.priority === "URGENT" ? "border-red-300" : ticket.priority === "HIGH" ? "border-orange-200" : "border-border"}`}>
              {/* Header row */}
              <button
                type="button"
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface/40 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                aria-expanded={isExpanded}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-semibold text-sm text-gray-900 truncate max-w-[300px]">{ticket.subject}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[ticket.status] ?? ""}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[ticket.priority] ?? ""}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{ticket.category}</span>
                    {ticket.slaStatus !== "met" && ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${slaInfo.className}`}>
                        {slaInfo.icon}
                        {slaInfo.label(ticket.timeRemainingMinutes)}
                      </span>
                    )}
                    {ticket.slaStatus === "met" && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        {slaInfo.icon} Responded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{ticket.user.name}</span>
                    {" "}&middot; {timeAgo(ticket.createdAt)}
                    {ticket.assignee && ` · Assigned to ${ticket.assignee.id === viewerId ? "me" : ticket.assignee.name}`}
                    {visibleReplies.length > 0 && ` · ${visibleReplies.length} repl${visibleReplies.length === 1 ? "y" : "ies"}`}
                    {internalNotes.length > 0 && ` · ${internalNotes.length} note${internalNotes.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Original message */}
                  <div className="p-4 bg-surface/20">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.body}</p>
                    {ticket.fileS3Key && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Attachment uploaded
                      </p>
                    )}
                    {ticket.resolutionSummary && (
                      <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-1">Resolution summary</p>
                        <p className="text-sm text-green-800 whitespace-pre-wrap">{ticket.resolutionSummary}</p>
                      </div>
                    )}
                  </div>

                  {/* Reply thread */}
                  {ticket.replies.length > 0 && (
                    <div className="px-4 pb-2 space-y-2">
                      {ticket.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`rounded-lg px-3 py-2.5 text-sm ${
                            reply.isInternal
                              ? "bg-yellow-50 border border-yellow-200"
                              : reply.isStaff
                                ? "bg-primary/5 border border-primary/20 ml-4"
                                : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-medium text-gray-700">{reply.author.name}</p>
                            {reply.isInternal && (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Internal note</span>
                            )}
                            {reply.isStaff && !reply.isInternal && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Support</span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action row */}
                  <div className="px-4 py-3 border-t border-border flex flex-wrap items-center gap-2 bg-gray-50/50">
                    {/* Assign to me */}
                    <button
                      type="button"
                      onClick={() => void assignToMe(ticket.id)}
                      className="btn-secondary text-xs"
                    >
                      {ticket.assignee?.id === viewerId ? "Assigned to me" : ticket.assignee ? `Re-assign to me` : "Assign to me"}
                    </button>

                    {/* Priority */}
                    <select
                      aria-label="Priority"
                      className="input text-xs max-w-[110px]"
                      value={ticket.priority}
                      onChange={(e) => void updatePriority(ticket.id, e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>

                    {/* Status */}
                    <select
                      aria-label="Status"
                      className="input text-xs max-w-[130px]"
                      value={ticket.status}
                      onChange={(e) => {
                        if (e.target.value === "CLOSED") {
                          setCloseModal({ id: ticket.id, subject: ticket.subject });
                          setResolutionSummary("");
                          setError("");
                        } else {
                          void updateStatus(ticket.id, e.target.value);
                        }
                      }}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Close (requires summary)</option>
                    </select>

                    {/* User profile */}
                    <button
                      type="button"
                      onClick={() => void loadUserProfile(ticket.id)}
                      className={`btn-ghost text-xs inline-flex items-center gap-1 ${profileTicketId === ticket.id ? "bg-primary/10 text-primary" : ""}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      {profileTicketId === ticket.id ? "Hide profile" : "User profile"}
                    </button>

                    {/* Full thread */}
                    <Link
                      href={`/system/support/${ticket.id}`}
                      className="btn-ghost text-xs inline-flex items-center gap-1"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      Full view
                    </Link>
                  </div>

                  {/* User profile panel */}
                  {profileTicketId === ticket.id && (
                    <div className="px-4 pb-4">
                      {profileLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                      ) : userProfile ? (
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <p className="text-xs font-semibold text-blue-700 col-span-2 mb-1">User technical profile (no business data)</p>
                          <span className="text-gray-500 text-xs">Name</span><span className="text-xs font-medium">{userProfile.name}</span>
                          <span className="text-gray-500 text-xs">Email</span><span className="text-xs">{userProfile.email ?? "none"}</span>
                          <span className="text-gray-500 text-xs">Role</span><span className="text-xs">{userProfile.roleLabel}</span>
                          <span className="text-gray-500 text-xs">Account status</span>
                          <span className={`text-xs font-medium ${userProfile.status === "ACTIVE" ? "text-green-700" : "text-red-600"}`}>{userProfile.status}</span>
                          <span className="text-gray-500 text-xs">2FA enrolled</span>
                          <span className={`text-xs font-medium ${userProfile.totpEnabled ? "text-green-700" : "text-amber-600"}`}>
                            {userProfile.totpEnabled ? "Yes" : "No"}
                          </span>
                          <span className="text-gray-500 text-xs">Active sessions</span><span className="text-xs">{userProfile.activeSessionCount}</span>
                          <span className="text-gray-500 text-xs">Joined</span>
                          <span className="text-xs">{new Date(userProfile.joinedAt).toLocaleDateString("en-UG", { dateStyle: "medium" })}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Could not load profile.</p>
                      )}
                    </div>
                  )}

                  {/* Reply form */}
                  {ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && (
                    <div className="px-4 pb-4 space-y-2">
                      {/* Canned reply picker */}
                      {cannedReplies.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCanned(showCanned === ticket.id ? null : ticket.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Use canned reply ({cannedReplies.length})
                          </button>
                          {showCanned === ticket.id && (
                            <div className="absolute z-10 left-0 top-6 w-72 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
                              {cannedReplies.map((cr) => (
                                <button
                                  key={cr.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary/5 border-b border-border last:border-0"
                                  onClick={() => {
                                    setReplyBody((prev) => ({ ...prev, [ticket.id]: cr.body }));
                                    setShowCanned(null);
                                  }}
                                >
                                  <p className="font-medium text-xs">{cr.title}</p>
                                  <p className="text-gray-500 text-xs truncate">{cr.body.slice(0, 60)}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <textarea
                        className="input min-h-[80px] resize-y text-sm w-full"
                        placeholder="Reply to requester..."
                        value={replyBody[ticket.id] ?? ""}
                        onChange={(e) =>
                          setReplyBody((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                        }
                        rows={3}
                      />

                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={isInternal[ticket.id] ?? false}
                            onChange={(e) =>
                              setIsInternal((prev) => ({ ...prev, [ticket.id]: e.target.checked }))
                            }
                          />
                          <span className="text-yellow-700 font-medium">Internal note (not visible to user)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => void sendReply(ticket.id)}
                          disabled={!replyBody[ticket.id]?.trim() || replying === ticket.id}
                          className="btn-primary inline-flex items-center gap-1.5 text-sm"
                        >
                          {replying === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {isInternal[ticket.id] ? "Save note" : "Send reply"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Close with resolution summary modal */}
      {closeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">Close ticket</h2>
              <button type="button" onClick={() => setCloseModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              <strong>{closeModal.subject}</strong>
            </p>
            {error && (
              <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}
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
                minLength={5}
              />
              <p className="text-xs text-gray-400 mt-1">{resolutionSummary.length} chars (minimum 5)</p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-ghost flex-1" onClick={() => { setCloseModal(null); setError(""); }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => void handleClose()}
                disabled={closing || resolutionSummary.trim().length < 5}
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                Close ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage canned replies modal */}
      {showManageCanned && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between sticky top-0 bg-white pb-2 border-b border-border">
              <h2 className="font-semibold">Manage canned replies</h2>
              <button type="button" onClick={() => setShowManageCanned(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing canned replies */}
            {cannedReplies.length === 0 ? (
              <p className="text-sm text-gray-400">No canned replies yet.</p>
            ) : (
              <div className="space-y-2">
                {cannedReplies.map((cr) => (
                  <div key={cr.id} className="border border-border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{cr.title}</p>
                      <button
                        type="button"
                        onClick={() => void deleteCannedReply(cr.id)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                        aria-label="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cr.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Add new canned reply</p>
              <input
                type="text"
                className="input w-full text-sm"
                placeholder="Title (e.g. Account locked)"
                value={newCannedTitle}
                onChange={(e) => setNewCannedTitle(e.target.value)}
                maxLength={100}
              />
              <textarea
                rows={4}
                className="input w-full text-sm resize-none"
                placeholder="Response body..."
                value={newCannedBody}
                onChange={(e) => setNewCannedBody(e.target.value)}
                maxLength={3000}
              />
              <button
                type="button"
                onClick={() => void saveCannedReply()}
                disabled={!newCannedTitle.trim() || !newCannedBody.trim() || savingCanned}
                className="btn-primary text-sm"
              >
                {savingCanned ? "Saving..." : "Add canned reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports modal */}
      {showReports && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between sticky top-0 bg-white pb-2 border-b border-border">
              <h2 className="font-semibold">Support analytics</h2>
              <button type="button" onClick={() => setShowReports(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!reports ? (
              <div className="flex items-center gap-2 text-gray-400 py-6 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </div>
            ) : (
              <ReportsPanel reports={reports} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Panel ────────────────────────────────────────────────────────────

function ReportsPanel({ reports }: { reports: Record<string, unknown> }) {
  const byStatus = reports.byStatus as Record<string, number>;
  const byCategory = reports.byCategory as Record<string, number>;
  const byPriority = reports.byPriority as Record<string, number>;

  function fmt(minutes: number | null) {
    if (minutes === null) return "n/a";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total tickets" value={String(reports.total)} />
        <Stat label="SLA breaches" value={String(reports.slaBreachCount)} color={Number(reports.slaBreachCount) > 0 ? "text-red-600" : "text-green-600"} />
        <Stat label="Avg first response" value={fmt(reports.avgFirstResponseMinutes as number | null)} />
        <Stat label="Avg resolution time" value={fmt(reports.avgResolutionMinutes as number | null)} />
        <Stat label="Open without reply" value={String(reports.noReplyOpen)} color={Number(reports.noReplyOpen) > 0 ? "text-amber-600" : "text-green-600"} />
        <Stat label="SLA target" value={`${Math.round(Number(reports.slaTargetMinutes) / 60)}h`} />
      </div>

      {/* By status */}
      <div>
        <p className="font-medium mb-2 text-gray-700">By status</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byStatus).map(([k, v]) => (
            <div key={k} className="flex justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-gray-600">{k.replace("_", " ")}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      <div>
        <p className="font-medium mb-2 text-gray-700">By category</p>
        <div className="space-y-1">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${Math.round((v / Number(reports.total)) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-24 truncate">{k}</span>
              <span className="text-xs font-medium w-6 text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By priority */}
      <div>
        <p className="font-medium mb-2 text-gray-700">By priority</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byPriority).map(([k, v]) => (
            <div key={k} className="flex justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
              <span className={`font-medium ${k === "URGENT" ? "text-red-600" : k === "HIGH" ? "text-orange-600" : "text-gray-600"}`}>{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-gray-900" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
