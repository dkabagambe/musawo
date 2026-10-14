import React from "react";

// ─── ExamResultBadge ──────────────────────────────────────────────────────────

export interface ExamResultBadgeProps {
  score: number;
  maxScore: number;
  passed?: boolean | null;
  passPercent: number;
  needsReview?: boolean;
}

export function ExamResultBadge({
  score,
  maxScore,
  passed,
  passPercent,
  needsReview = false,
}: ExamResultBadgeProps) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  if (needsReview) {
    return (
      <div className="flex items-center gap-2">
        <span className="badge badge-warning text-xs">⏳ Pending review</span>
        <span className="text-xs text-gray-400">Pass mark: {passPercent}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-bold text-primary">{percentage}%</span>
      <div>
        <span
          className={`badge text-xs ${passed ? "badge-success" : "badge-danger"}`}
        >
          {passed ? "✅ PASS" : "❌ FAIL"}
        </span>
        <p className="text-xs text-gray-400 mt-0.5">
          {score}/{maxScore} pts · pass mark {passPercent}%
        </p>
      </div>
    </div>
  );
}

// ─── ExamAttemptRow ───────────────────────────────────────────────────────────

export interface ExamAttemptRowProps {
  attemptNumber: number;
  score?: number | null;
  maxScore?: number | null;
  passed?: boolean | null;
  submittedAt?: string | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "MARKED";
}

export function ExamAttemptRow({
  attemptNumber,
  score,
  maxScore,
  passed,
  submittedAt,
  status,
}: ExamAttemptRowProps) {
  const percentage =
    status === "MARKED" && score != null && maxScore != null && maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : null;

  return (
    <tr>
      <td className="py-2 pr-4 text-sm">Attempt {attemptNumber}</td>
      <td className="py-2 pr-4">
        {status === "IN_PROGRESS" && (
          <span className="badge badge-warning text-xs">In progress</span>
        )}
        {status === "SUBMITTED" && (
          <span className="badge badge-info text-xs">⏳ Awaiting review</span>
        )}
        {status === "MARKED" && passed != null && (
          <span className={`badge text-xs ${passed ? "badge-success" : "badge-danger"}`}>
            {passed ? "✅ Pass" : "❌ Fail"}
          </span>
        )}
      </td>
      <td className="py-2 pr-4 text-sm text-gray-600">
        {percentage !== null ? (
          <span>
            {percentage}%{" "}
            <span className="text-xs text-gray-400">
              ({score}/{maxScore} pts)
            </span>
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="py-2 text-xs text-gray-400">
        {submittedAt
          ? new Date(submittedAt).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-"}
      </td>
    </tr>
  );
}
