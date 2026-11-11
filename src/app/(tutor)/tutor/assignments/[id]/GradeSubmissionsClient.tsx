"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, ClipboardList } from "lucide-react";

interface Submission {
  id: string;
  studentName: string;
  studentNumber: string | null;
  textBody: string | null;
  submittedAt: string | null;
  grade: number | null;
  feedback: string | null;
  status: string;
}

interface Props {
  assignmentId: string;
  maxPoints: number;
  submissions: Submission[];
}

export default function GradeSubmissionsClient({ assignmentId, maxPoints, submissions: initial }: Props) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>(initial);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [grades, setGrades]           = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving]           = useState<string | null>(null);
  const [errors, setErrors]           = useState<Record<string, string>>({});

  function toggle(id: string) {
    setExpanded((e) => (e === id ? null : id));
    if (!grades[id]) {
      const sub = submissions.find((s) => s.id === id);
      setGrades((g) => ({
        ...g,
        [id]: { grade: sub?.grade?.toString() ?? "", feedback: sub?.feedback ?? "" },
      }));
    }
  }

  async function handleGrade(subId: string) {
    const { grade, feedback } = grades[subId] ?? {};
    const gradeNum = parseInt(grade ?? "", 10);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > maxPoints) {
      setErrors((e) => ({ ...e, [subId]: `Grade must be 0 to ${maxPoints}.` }));
      return;
    }
    setSaving(subId);
    setErrors((e) => ({ ...e, [subId]: "" }));
    try {
      const res = await fetch(`/api/tutor/assignments/${assignmentId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: subId, grade: gradeNum, feedback: feedback || null }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setErrors((e) => ({ ...e, [subId]: data.error ?? "Failed." })); return; }
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? { ...s, grade: gradeNum, feedback: feedback || null, status: "GRADED" }
            : s,
        ),
      );
      router.refresh();
    } catch {
      setErrors((e) => ({ ...e, [subId]: "Network error." }));
    } finally {
      setSaving(null);
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="card text-center py-12">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-sm">No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">
        Submissions ({submissions.length})
      </h2>
      {submissions.map((sub) => {
        const isOpen = expanded === sub.id;
        const g = grades[sub.id];
        return (
          <div
            key={sub.id}
            className={`card transition-all ${sub.status === "GRADED" ? "border-success/30" : "border-warning/30"}`}
          >
            <button
              type="button"
              onClick={() => toggle(sub.id)}
              className="w-full flex items-center justify-between gap-4 text-left"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${sub.status === "GRADED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {sub.status === "GRADED" ? <CheckCircle2 className="w-4 h-4" /> : sub.studentName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-primary truncate">{sub.studentName}</p>
                  {sub.studentNumber && (
                    <p className="text-xs text-gray-400">{sub.studentNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {sub.grade !== null ? (
                  <span className="text-sm font-bold text-success">
                    {sub.grade}/{maxPoints}
                  </span>
                ) : (
                  <span className="badge badge-warning text-xs">Not graded</span>
                )}
                {sub.submittedAt && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {new Date(sub.submittedAt).toLocaleDateString("en-UG")}
                  </span>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                {/* Student answer */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student answer</p>
                  {sub.textBody ? (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {sub.textBody}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No text submitted.</p>
                  )}
                </div>

                {/* Grading form */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`grade-${sub.id}`} className="label">
                      Grade (0 to {maxPoints}) *
                    </label>
                    <input
                      id={`grade-${sub.id}`}
                      type="number"
                      min={0}
                      max={maxPoints}
                      className="input"
                      value={g?.grade ?? ""}
                      onChange={(e) =>
                        setGrades((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], grade: e.target.value } }))
                      }
                      placeholder={`0 to ${maxPoints}`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`fb-${sub.id}`} className="label">Feedback (optional)</label>
                    <textarea
                      id={`fb-${sub.id}`}
                      className="input resize-y min-h-[72px]"
                      value={g?.feedback ?? ""}
                      onChange={(e) =>
                        setGrades((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], feedback: e.target.value } }))
                      }
                      placeholder="Write brief feedback for the student..."
                      maxLength={2000}
                    />
                  </div>
                </div>

                {errors[sub.id] && (
                  <p className="text-sm text-danger">{errors[sub.id]}</p>
                )}

                <button
                  type="button"
                  onClick={() => void handleGrade(sub.id)}
                  disabled={saving === sub.id}
                  className="btn-primary text-sm"
                >
                  {saving === sub.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : sub.status === "GRADED" ? (
                    "Update grade"
                  ) : (
                    "Save grade"
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
