"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  exams: any[];
  courses: any[];
  liveAttempts: any[];
  upcomingExams: any[];
  activeExams: any[];
  tab: string;
  selectedCourseId: string | null;
  canCreate: boolean;
  canManage: boolean;
};

export default function ExaminationsView({
  exams,
  courses,
  liveAttempts,
  upcomingExams,
  activeExams,
  tab,
  selectedCourseId,
  canCreate,
  canManage,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const STATUS_BADGE: Record<string, string> = {
    DRAFT: "badge-warning",
    PUBLISHED: "badge-success",
    ARCHIVED: "badge-secondary",
  };

  const handleCourseFilter = (courseId: string) => {
    const params = new URLSearchParams({ tab });
    if (courseId) params.set("courseId", courseId);
    router.push(`/principal/examinations?${params.toString()}`);
  };

  const handleDownloadResults = async (examId: string) => {
    window.open(`/api/principal/examinations/${examId}/results`, "_blank");
  };

  const handleDownloadQuestions = async (examId: string) => {
    window.open(`/api/principal/examinations/${examId}/questions`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Examinations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage exams, monitor live sessions
          </p>
        </div>
        {canCreate && (
          <Link href="/principal/examinations/create" className="btn-primary no-underline">
            + Create Exam
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {[
          { value: "all", label: `All Exams (${exams.length})` },
          { value: "timetable", label: `Timetable (${upcomingExams.length})` },
          { value: "live", label: `🔴 Live Monitoring (${liveAttempts.length})` },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/principal/examinations?tab=${t.value}`}
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

      {/* Course Filter */}
      {tab === "all" && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Filter by Course</label>
          <select
            value={selectedCourseId || ""}
            onChange={(e) => handleCourseFilter(e.target.value)}
            className="input max-w-md"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} - {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {tab === "all" && (
        <div>
          {exams.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-gray-500 text-sm">
                {selectedCourseId ? "No exams for this course." : "No exams found."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((e) => (
                <div key={e.id} className="card">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="font-semibold">{e.title}</h2>
                        <span className={`badge text-xs ${STATUS_BADGE[e.status] ?? "badge-info"}`}>
                          {e.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {e.course.courseCode} - {e.course.title}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                        <span>Questions: {e._count.questions}</span>
                        <span>Attempts: {e._count.attempts}</span>
                        <span>Pass: {e.passPercent}%</span>
                        {e.timeLimitMin && <span>Time: {e.timeLimitMin} min</span>}
                        {e.perQuestionSec && <span>Per Q: {e.perQuestionSec}s</span>}
                        {e.shuffleQuestions && <span>🔀 Shuffle</span>}
                      </div>
                      {e.startWindowAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Opens: {new Date(e.startWindowAt).toLocaleString("en-UG")}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          href={`/principal/examinations/${e.id}/edit`}
                          className="btn-secondary text-xs no-underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDownloadQuestions(e.id)}
                          className="btn-secondary text-xs"
                          title="Download question paper"
                        >
                          📄 Questions
                        </button>
                        <button
                          onClick={() => handleDownloadResults(e.id)}
                          className="btn-secondary text-xs"
                          title="Download results"
                        >
                          📊 Results
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "timetable" && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">
              <strong>Exam Timetable:</strong> Shows published exams with scheduled start windows.
            </p>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">📅</p>
              <p className="text-gray-500 text-sm">No upcoming exams scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((e) => (
                <div key={e.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="font-semibold">{e.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {e.course.courseCode} - {e.course.title}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>📅 {new Date(e.startWindowAt).toLocaleDateString("en-UG")}</span>
                        <span>
                          🕐{" "}
                          {new Date(e.startWindowAt).toLocaleTimeString("en-UG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {e.timeLimitMin && <span>⏱️ {e.timeLimitMin} min</span>}
                        <span>Pass: {e.passPercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "live" && (
        <div>
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-sm">
              <strong>🔴 Live Monitoring:</strong> Students currently taking exams. Track progress and
              tab switches.
            </p>
          </div>

          {liveAttempts.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No exams in progress right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveAttempts.map((attempt) => (
                <div key={attempt.id} className="card border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="font-semibold text-sm">{attempt.user.name}</h2>
                        <span className="badge badge-danger text-xs">IN PROGRESS</span>
                      </div>
                      <p className="text-sm text-gray-500">{attempt.exam.title}</p>
                      <p className="text-xs text-gray-400">{attempt.exam.course.title}</p>

                      <div className="flex gap-4 mt-3 text-xs">
                        <div>
                          <span className="text-gray-500">Student No:</span>{" "}
                          <span className="font-mono">{attempt.user.studentNumber || "-"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Started:</span>{" "}
                          <span>
                            {new Date(attempt.startedAt).toLocaleTimeString("en-UG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {attempt.timeLimitEndsAt && (
                          <div>
                            <span className="text-gray-500">Ends:</span>{" "}
                            <span>
                              {new Date(attempt.timeLimitEndsAt).toLocaleTimeString("en-UG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-gray-500">Progress:</span>{" "}
                          <span className="font-medium">
                            Q{attempt.currentQuestionIndex + 1}
                          </span>
                        </div>
                        {attempt.tabSwitches > 0 && (
                          <div className="text-warning font-medium">
                            ⚠️ {attempt.tabSwitches} tab switch{attempt.tabSwitches !== 1 ? "es" : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex gap-2">
                        <Link
                          href={`/principal/examinations/attempts/${attempt.id}`}
                          className="btn-secondary text-xs no-underline"
                        >
                          Monitor
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
