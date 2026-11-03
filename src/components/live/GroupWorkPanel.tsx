"use client";

/**
 * GroupWorkPanel - instructor-side: view and grade group work submissions.
 * Supports group mark + optional per-member individual mark adjustments.
 */

import React, { useCallback, useEffect, useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

interface IndividualMark {
  userId: string;
  mark: number;
  note?: string;
}

interface Submission {
  id: string;
  title: string;
  body?: string | null;
  submittedAt: string;
  groupMark: number | null;
  gradedAt: string | null;
  individualMarks?: IndividualMark[] | null;
  group: {
    id: string;
    name: string;
    members: { id: string; user: { id: string; name: string } }[];
  };
}

interface Props {
  classId: string;
  isInstructor?: boolean;
}

export default function GroupWorkPanel({ classId, isInstructor }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [msg, setMsg] = useState("");

  // Per-submission grading state
  const [grading, setGrading] = useState<Record<string, {
    groupMark: string;
    saving: boolean;
    showIndividual: boolean;
    individualMarks: Record<string, { mark: string; note: string }>;
  }>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${classId}/work`);
    if (res.ok) {
      const data = await res.json();
      const subs: Submission[] = data.submissions ?? [];
      setSubmissions(subs);
      // Initialise grading state from existing data
      setGrading((prev) => {
        const next = { ...prev };
        for (const s of subs) {
          if (!next[s.id]) {
            const indiv: Record<string, { mark: string; note: string }> = {};
            if (s.individualMarks) {
              for (const im of s.individualMarks) {
                indiv[im.userId] = { mark: String(im.mark), note: im.note ?? "" };
              }
            }
            next[s.id] = {
              groupMark: s.groupMark !== null ? String(s.groupMark) : "",
              saving: false,
              showIndividual: (s.individualMarks?.length ?? 0) > 0,
              individualMarks: indiv,
            };
          }
        }
        return next;
      });
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  function setGradingField(submissionId: string, field: "groupMark" | "showIndividual", value: string | boolean) {
    setGrading((p) => ({
      ...p,
      [submissionId]: { ...p[submissionId], [field]: value },
    }));
  }

  function setIndividualMark(submissionId: string, userId: string, field: "mark" | "note", value: string) {
    setGrading((p) => ({
      ...p,
      [submissionId]: {
        ...p[submissionId],
        individualMarks: {
          ...p[submissionId]?.individualMarks,
          [userId]: {
            ...(p[submissionId]?.individualMarks?.[userId] ?? { mark: "", note: "" }),
            [field]: value,
          },
        },
      },
    }));
  }

  async function grade(submission: Submission) {
    const g = grading[submission.id];
    if (!g) return;
    const groupMark = Number(g.groupMark);
    if (isNaN(groupMark) || groupMark < 0 || groupMark > 100) {
      setMsg("Group mark must be between 0 and 100.");
      return;
    }

    // Build individual marks only if the panel is open
    let individualMarks: IndividualMark[] | undefined;
    if (g.showIndividual) {
      individualMarks = submission.group.members.map((m) => {
        const entry = g.individualMarks?.[m.user.id];
        const mark = entry ? Number(entry.mark) : groupMark;
        return { userId: m.user.id, mark: isNaN(mark) ? groupMark : mark, note: entry?.note || undefined };
      });
    }

    setGrading((p) => ({ ...p, [submission.id]: { ...p[submission.id], saving: true } }));
    try {
      const res = await fetch(`/api/groups/${classId}/work`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, groupMark, individualMarks }),
      });
      if (res.ok) {
        setMsg("Mark saved.");
        await load();
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Failed to save mark.");
      }
    } finally {
      setGrading((p) => ({ ...p, [submission.id]: { ...p[submission.id], saving: false } }));
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

          {submissions.map((s) => {
            const g = grading[s.id] ?? { groupMark: "", saving: false, showIndividual: false, individualMarks: {} };
            return (
              <div key={s.id} className="border border-border rounded-xl bg-white p-3 space-y-3">
                {/* Header */}
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
                  {s.group.members.map((m) => {
                    const indiv = s.individualMarks?.find((im) => im.userId === m.user.id);
                    return (
                      <span key={m.id} className="text-xs bg-surface rounded-full px-2 py-0.5 text-gray-600">
                        {m.user.name}
                        {indiv && <span className="ml-1 text-success font-bold">{indiv.mark}</span>}
                      </span>
                    );
                  })}
                </div>

                {/* ─── Group mark ─────────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-gray-500">Group mark:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input !py-1 text-sm w-20"
                    placeholder="0-100"
                    value={g.groupMark}
                    onChange={(e) => setGradingField(s.id, "groupMark", e.target.value)}
                  />
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>

                {/* ─── Individual adjustments toggle ───────────────────────────────── */}
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-primary flex items-center gap-1"
                  onClick={() => setGradingField(s.id, "showIndividual", !g.showIndividual)}
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${g.showIndividual ? "rotate-90" : ""}`} />
                  {g.showIndividual ? "Hide" : "Set"} individual mark adjustments (optional)
                </button>

                {g.showIndividual && (
                  <div className="space-y-2 border border-dashed border-border rounded-xl p-3 bg-surface">
                    <p className="text-xs text-gray-500">Leave blank to use the group mark. Enter a different mark per student if needed.</p>
                    {s.group.members.map((m) => {
                      const entry = g.individualMarks?.[m.user.id] ?? { mark: "", note: "" };
                      return (
                        <div key={m.user.id} className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-700 w-36 truncate" title={m.user.name}>{m.user.name}</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="input !py-1 text-xs w-16"
                            placeholder={g.groupMark || "mark"}
                            value={entry.mark}
                            onChange={(e) => setIndividualMark(s.id, m.user.id, "mark", e.target.value)}
                          />
                          <input
                            type="text"
                            className="input !py-1 text-xs flex-1"
                            placeholder="Note (optional)"
                            value={entry.note}
                            onChange={(e) => setIndividualMark(s.id, m.user.id, "note", e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Save button */}
                <button
                  type="button"
                  disabled={g.saving || !g.groupMark}
                  onClick={() => void grade(s)}
                  className="btn-secondary text-xs"
                >
                  {g.saving ? "Saving..." : "Save mark"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
