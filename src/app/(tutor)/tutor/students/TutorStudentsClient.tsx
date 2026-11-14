"use client";

import { useState, useMemo } from "react";
import { Mail, Search, Download, ChevronRight } from "lucide-react";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";
import MessageDrawer from "@/components/messaging/MessageDrawer";
import Link from "next/link";
import type { ConversationUser } from "@/components/messaging/ConversationPanel";

export interface StudentRow {
  id: string; // enrolment id
  status: string;
  createdAt: string;
  attendancePct: number | null;
  lastActiveDaysAgo: number | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    studentNumber: string | null;
    avatarUrl: string | null;
    role: string;
  };
  courseTitle: string;
  courseId: string;
}

interface Props {
  currentUserId: string;
  rows: StudentRow[];
  courseOptions: { id: string; title: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  PARTIALLY_PAID: "Partial payment",
  OVERDUE: "Overdue",
  PENDING_PAYMENT: "Pending payment",
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  COMPLETED: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-danger/10 text-danger",
  PENDING_PAYMENT: "bg-gray-100 text-gray-600",
};

export default function TutorStudentsClient({ currentUserId, rows, courseOptions }: Props) {
  const [messagingUser, setMessagingUser] = useState<ConversationUser | null>(null);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterCourse !== "all" && r.courseId !== filterCourse) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (q) {
        return (
          r.user.name.toLowerCase().includes(q) ||
          (r.user.studentNumber ?? "").toLowerCase().includes(q) ||
          (r.user.email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, filterCourse, filterStatus]);

  // Export visible rows as CSV
  function exportCSV() {
    const cols = ["Name", "Student No.", "Course", "Status", "Attendance %", "Last Active", "Enrolled"];
    const dataRows = filtered.map((r) => [
      r.user.name,
      r.user.studentNumber ?? "",
      r.courseTitle,
      STATUS_LABEL[r.status] ?? r.status,
      r.attendancePct != null ? `${r.attendancePct}%` : "",
      r.lastActiveDaysAgo != null ? (r.lastActiveDaysAgo === 0 ? "Today" : `${r.lastActiveDaysAgo}d ago`) : "",
      new Date(r.createdAt).toLocaleDateString("en-UG"),
    ]);
    const csv = [cols, ...dataRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openMessage(row: StudentRow) {
    setMessagingUser({
      id: row.user.id,
      name: row.user.name,
      role: row.user.role,
      avatarUrl: row.user.avatarUrl,
      studentNumber: row.user.studentNumber,
    });
  }

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name or student number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm"
            aria-label="Search students"
          />
        </div>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="input !w-auto text-sm"
          aria-label="Filter by course"
        >
          <option value="all">All courses</option>
          {courseOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input !w-auto text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          className="btn-outline text-sm flex items-center gap-1.5 flex-shrink-0"
          aria-label="Export student list as CSV"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} student{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-10 text-center">
          <p className="text-gray-400 text-sm">No students match your filter.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="students-table">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Student No.</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Course</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Attendance</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Last active</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarOrInitials
                          name={row.user.name}
                          avatarUrl={row.user.avatarUrl}
                          size={32}
                        />
                        <span className="font-medium text-primary">{row.user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="font-mono text-xs text-gray-500">
                        {row.user.studentNumber ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-gray-500 max-w-40 truncate">
                      {row.courseTitle}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {row.attendancePct != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-16">
                            <div
                              className={`rounded-full h-1.5 ${row.attendancePct >= 75 ? "bg-success" : row.attendancePct >= 50 ? "bg-amber-500" : "bg-danger"}`}
                              style={{ width: `${row.attendancePct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{row.attendancePct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-gray-400">
                      {row.lastActiveDaysAgo != null
                        ? row.lastActiveDaysAgo === 0
                          ? "Today"
                          : `${row.lastActiveDaysAgo}d ago`
                        : "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openMessage(row)}
                          className="btn-ghost flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors"
                          aria-label={`Message ${row.user.name}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Message</span>
                        </button>
                        <Link
                          href={`/tutor/students/${row.user.id}`}
                          className="btn-ghost flex items-center gap-1 text-xs text-gray-500 hover:bg-surface px-2 py-1.5 rounded-lg transition-colors no-underline"
                          aria-label={`View ${row.user.name} details`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message Drawer */}
      {messagingUser && (
        <MessageDrawer
          currentUserId={currentUserId}
          openWithUser={messagingUser}
          onClose={() => setMessagingUser(null)}
        />
      )}
    </>
  );
}
