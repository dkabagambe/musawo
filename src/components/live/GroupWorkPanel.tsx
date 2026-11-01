"use client";

/**
 * GroupWorkPanel - instructor-side: view and grade group work submissions.
 */

import React, { useCallback, useEffect, useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

interface Submission {
  id: string;
  title: string;
  body?: string | null;
  submittedAt: string;
  groupMark: number | null;
  gradedAt: string | null;
  group: {
    id: string;
    name: string;
    members: { id: string; user: { id: string; name: string } }[];
  };
  individualMarks?: { userId: string; mark: number; note?: string }[] | null;
}

interface Props {
  classId: string;
  isInstructor?: boolean;
}

export default function GroupWorkPanel({ classId, isInstructor }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [grading, setGrading] = useState<Record<string, { mark: string; saving: boolean }>>({});
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${classId}/work`);
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  async function grade(submissionId: string, groupMark: number) {
    setGrading((p) => ({ ...p, [submissionId]: { ...p[submissionId], saving: true } }));
    try {
      const res = await fetch(`/api/groups/${classId}/work`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, groupMark }),
      });
      if (res.ok) {
        setMsg("Mark saved.");
        await load();
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Failed.");
      }
    } finally {
      setGrading((p) => ({ ...p, [submissionId]: { ...p[submissionId], saving: false } }));
    }
  }

  if (!isInstructor) return null;

  return (
    <div className="border border-border rounded-2xl bg-surface">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-gray-50 rounded-2xl transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <ClipboardList className="w-4 h-4 text-accent" />
        Group Work Submissions
        {submissions.length > 0 && (
          <span className="ml-1 text-xs font-normal text-gray-500">({submissions.length})</span>
        )}
        <span className="ml-auto">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {msg && <p className="text-sm text-accent font-medium bg-accent/10 px-3 py-2 rounded-xl">{msg}</p>}

          {loading && <p className="text-sm text-gray-400">Loading...</p>}

          {!loading && submissions.length === 0 && (
            <p className="text-sm text-gray-400">No group submissions yet.</p>
          )}

          {submissions.map((s) => (
            <div key={s.id} className="border border-border rounded-xl bg-white p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-sm text-primary">{s.group.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{new Date(s.submittedAt).toLocaleDateString("en-UG")}</span>
                </div>
                {s.groupMark !== null && (
                  <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    Mark: {s.groupMark}/100
                  </span>
                )}
              </div>

              <p className="text-sm font-medium">{s.title}</p>
              {s.body && <p className="text-xs text-gray-600 whitespace-pre-wrap">{s.body}</p>}

              {/* Members */}
              <div className="flex flex-wrap gap-1">
                {s.group.members.map((m) => (
                  <span key={m.id} className="text-xs bg-surface rounded-full px-2 py-0.5 text-gray-600">{m.user.name}</span>
                ))}
              </div>

              {/* Grade input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input !py-1 text-sm w-20"
                  placeholder="Mark"
                  value={grading[s.id]?.mark ?? s.groupMark ?? ""}
                  onChange={(e) => setGrading((p) => ({ ...p, [s.id]: { mark: e.target.value, saving: false } }))}
                />
                <span className="text-xs text-gray-400">/ 100</span>
                <button
                  type="button"
                  disabled={grading[s.id]?.saving}
                  onClick={() => grade(s.id, Number(grading[s.id]?.mark ?? s.groupMark ?? 0))}
                  className="btn-secondary text-xs"
                >
                  {grading[s.id]?.saving ? "Saving..." : "Save mark"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
