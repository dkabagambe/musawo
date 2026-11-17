"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  tab: string;
  gradingSettings: any[];
  courses: any[];
  submittedResults: any[];
  scoredResults: any[];
  publicationApprovals: any[];
  publishedResults: any[];
  selectedCourseId: string | null;
  canEdit: boolean;
  canPublish: boolean;
  userId: string;
};

export default function ResultsView({
  tab,
  gradingSettings,
  courses,
  submittedResults,
  scoredResults,
  publicationApprovals,
  publishedResults,
  selectedCourseId,
  canEdit,
  canPublish,
  userId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showGradingForm, setShowGradingForm] = useState(false);
  const [editingGrading, setEditingGrading] = useState<any>(null);

  const handleCourseFilter = (courseId: string) => {
    const params = new URLSearchParams({ tab });
    if (courseId) params.set("courseId", courseId);
    router.push(`/principal/results?${params.toString()}`);
  };

  const handleSaveGradingSettings = async (formData: FormData) => {
    setLoading(true);
    try {
      const data = {
        courseId: formData.get("courseId") as string,
        passMarkPercent: parseInt(formData.get("passMarkPercent") as string),
        gradeAMin: parseInt(formData.get("gradeAMin") as string),
        gradeBMin: parseInt(formData.get("gradeBMin") as string),
        gradeCMin: parseInt(formData.get("gradeCMin") as string),
        gradeDMin: parseInt(formData.get("gradeDMin") as string),
      };

      const response = await fetch("/api/principal/results/grading-settings", {
        method: editingGrading ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGrading ? { id: editingGrading.id, ...data } : data),
      });

      if (!response.ok) throw new Error("Failed to save grading settings");

      setShowGradingForm(false);
      setEditingGrading(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to save grading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToDirector = async (examId: string) => {
    if (!confirm("Forward these results to the Director for approval and publication?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/principal/results/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });

      if (!response.ok) throw new Error("Failed to forward results");

      alert("Results forwarded to Director for approval");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to forward results");
    } finally {
      setLoading(false);
    }
  };

  const getLetterGrade = (percentage: number, settings: any) => {
    if (!settings) return "-";
    if (percentage >= settings.gradeAMin) return "A";
    if (percentage >= settings.gradeBMin) return "B";
    if (percentage >= settings.gradeCMin) return "C";
    if (percentage >= settings.gradeDMin) return "D";
    return "F";
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Results & Grading</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage grading system, review results, and forward to Director
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {[
          { value: "settings", label: "Grading Settings" },
          { value: "submitted", label: `Submitted (${submittedResults.length})` },
          { value: "scored", label: `Ready to Publish (${scoredResults.length})` },
          { value: "approvals", label: `Awaiting Director (${publicationApprovals.length})` },
          { value: "published", label: "Published Results" },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/principal/results?tab=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              tab === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Grading Settings Tab */}
      {tab === "settings" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Configure grade boundaries and pass marks per course
            </p>
            {canEdit && (
              <button
                onClick={() => {
                  setEditingGrading(null);
                  setShowGradingForm(true);
                }}
                className="btn-primary text-sm"
              >
                + Add Course Settings
              </button>
            )}
          </div>

          {gradingSettings.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-gray-500 text-sm">No grading settings configured yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gradingSettings.map((s) => (
                <div key={s.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {s.course.courseCode} - {s.course.title}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Pass Mark:</span>{" "}
                          <span className="font-semibold">{s.passMarkPercent}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">A:</span>{" "}
                          <span className="font-semibold">{s.gradeAMin}%+</span>
                        </div>
                        <div>
                          <span className="text-gray-500">B:</span>{" "}
                          <span className="font-semibold">{s.gradeBMin}%+</span>
                        </div>
                        <div>
                          <span className="text-gray-500">C:</span>{" "}
                          <span className="font-semibold">{s.gradeCMin}%+</span>
                        </div>
                        <div>
                          <span className="text-gray-500">D:</span>{" "}
                          <span className="font-semibold">{s.gradeDMin}%+</span>
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingGrading(s);
                          setShowGradingForm(true);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grading Form Modal */}
          {showGradingForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="card max-w-2xl w-full">
                <h2 className="text-lg font-semibold mb-4">
                  {editingGrading ? "Edit Grading Settings" : "Add Grading Settings"}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveGradingSettings(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Course <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="courseId"
                        required
                        defaultValue={editingGrading?.courseId || ""}
                        disabled={!!editingGrading}
                        className="input w-full"
                      >
                        <option value="">Select a course</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.courseCode} - {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Pass Mark (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="passMarkPercent"
                        required
                        min="0"
                        max="100"
                        defaultValue={editingGrading?.passMarkPercent || 60}
                        className="input w-full"
                      />
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="font-medium mb-3">Grade Boundaries (Minimum %)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Grade A (%) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="gradeAMin"
                            required
                            min="0"
                            max="100"
                            defaultValue={editingGrading?.gradeAMin || 80}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Grade B (%) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="gradeBMin"
                            required
                            min="0"
                            max="100"
                            defaultValue={editingGrading?.gradeBMin || 70}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Grade C (%) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="gradeCMin"
                            required
                            min="0"
                            max="100"
                            defaultValue={editingGrading?.gradeCMin || 60}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Grade D (%) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="gradeDMin"
                            required
                            min="0"
                            max="100"
                            defaultValue={editingGrading?.gradeDMin || 50}
                            className="input w-full"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Below D is F (fail). Grades are calculated automatically based on percentage.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? "Saving..." : "Save Settings"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGradingForm(false);
                        setEditingGrading(null);
                      }}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submitted Results Tab */}
      {tab === "submitted" && (
        <div>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-500">
              Results submitted by students, pending instructor scoring
            </p>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => handleCourseFilter(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.title}
                </option>
              ))}
            </select>
          </div>

          {submittedResults.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No submitted results pending scoring.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Exam</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submittedResults.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{a.user.name}</p>
                        <p className="text-xs text-gray-400">{a.user.studentNumber || "-"}</p>
                      </td>
                      <td className="py-2 pr-4">{a.exam.title}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{a.exam.course.title}</td>
                      <td className="py-2 text-xs text-gray-400">
                        {new Date(a.submittedAt).toLocaleString("en-UG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Scored Results (Ready to Publish) Tab */}
      {tab === "scored" && (
        <div>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-500">
              Results scored and ready to forward to Director for publication
            </p>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => handleCourseFilter(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.title}
                </option>
              ))}
            </select>
          </div>

          {scoredResults.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No results ready to publish.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by exam */}
              {Object.entries(
                scoredResults.reduce((acc: any, result: any) => {
                  const examId = result.exam.id;
                  if (!acc[examId]) {
                    acc[examId] = {
                      exam: result.exam,
                      results: [],
                    };
                  }
                  acc[examId].results.push(result);
                  return acc;
                }, {})
              ).map(([examId, data]: any) => (
                <div key={examId} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{data.exam.title}</h3>
                      <p className="text-sm text-gray-500">{data.exam.course.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {data.results.length} student{data.results.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {canPublish && (
                      <button
                        onClick={() => handleForwardToDirector(examId)}
                        disabled={loading}
                        className="btn-primary text-sm"
                      >
                        Forward to Director
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-border">
                          <th className="pb-2 font-medium pr-4">Student</th>
                          <th className="pb-2 font-medium pr-4 text-center">Score</th>
                          <th className="pb-2 font-medium pr-4 text-center">%</th>
                          <th className="pb-2 font-medium pr-4 text-center">Grade</th>
                          <th className="pb-2 font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.results.map((a: any) => {
                          const pct = a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0;
                          const settings = gradingSettings.find(
                            (g) => g.courseId === data.exam.course.id
                          );
                          const grade = getLetterGrade(pct, settings);

                          return (
                            <tr key={a.id}>
                              <td className="py-2 pr-4">
                                <p className="font-medium">{a.user.name}</p>
                                <p className="text-xs text-gray-400">{a.user.studentNumber || "-"}</p>
                              </td>
                              <td className="py-2 pr-4 text-center font-mono">
                                {a.score}/{a.maxScore}
                              </td>
                              <td className="py-2 pr-4 text-center font-semibold">{pct}%</td>
                              <td className="py-2 pr-4 text-center">
                                <span className="badge badge-info text-xs">{grade}</span>
                              </td>
                              <td className="py-2">
                                {a.passed ? (
                                  <span className="badge badge-success text-xs">Pass</span>
                                ) : (
                                  <span className="badge badge-danger text-xs">Fail</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approvals Tab */}
      {tab === "approvals" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Results forwarded to Director, awaiting publication approval
          </p>

          {publicationApprovals.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No publication requests pending.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publicationApprovals.map((approval) => (
                <div key={approval.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{approval.exam?.title || "Exam Results"}</h3>
                        <span className="badge badge-warning text-xs">{approval.status}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {approval.exam?.course.title || "Course"}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Requested by {approval.requestedBy.name} on{" "}
                        {new Date(approval.createdAt).toLocaleDateString("en-UG")}
                      </p>
                    </div>
                    <Link
                      href={`/principal/approvals-inbox/${approval.id}`}
                      className="btn-secondary text-sm no-underline"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Published Results Tab */}
      {tab === "published" && (
        <div>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-500">
              Results published and visible to students
            </p>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => handleCourseFilter(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.title}
                </option>
              ))}
            </select>
          </div>

          {publishedResults.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-gray-500 text-sm">No published results yet.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Exam</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium pr-4 text-center">Score</th>
                    <th className="pb-2 font-medium pr-4 text-center">Grade</th>
                    <th className="pb-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {publishedResults.map((a) => {
                    const pct = a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0;
                    const settings = gradingSettings.find((g) => g.courseId === a.exam.course.id);
                    const grade = getLetterGrade(pct, settings);

                    return (
                      <tr key={a.id}>
                        <td className="py-2 pr-4">
                          <p className="font-medium">{a.user.name}</p>
                          <p className="text-xs text-gray-400">{a.user.studentNumber || "-"}</p>
                        </td>
                        <td className="py-2 pr-4">{a.exam.title}</td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{a.exam.course.title}</td>
                        <td className="py-2 pr-4 text-center font-semibold">{pct}%</td>
                        <td className="py-2 pr-4 text-center">
                          <span className="badge badge-info text-xs">{grade}</span>
                        </td>
                        <td className="py-2">
                          {a.passed ? (
                            <span className="badge badge-success text-xs">Pass</span>
                          ) : (
                            <span className="badge badge-danger text-xs">Fail</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
