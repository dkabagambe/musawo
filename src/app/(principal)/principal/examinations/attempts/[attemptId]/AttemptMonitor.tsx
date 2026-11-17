"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  attempt: any;
  timeRemaining: number | null;
  userId: string;
  canControl: boolean;
};

export default function AttemptMonitor({ attempt, timeRemaining: initialTimeRemaining, userId, canControl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);

  const isInProgress = attempt.status === "IN_PROGRESS";

  // Countdown timer
  useEffect(() => {
    if (!isInProgress || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInProgress, timeRemaining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleExtendTime = async () => {
    const minutes = prompt("Extend time by how many minutes?");
    if (!minutes || isNaN(parseInt(minutes))) return;

    const reason = prompt("Reason for extending time (required):");
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/examinations/attempts/${attempt.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extensionMinutes: parseInt(minutes),
          reason,
        }),
      });

      if (!response.ok) throw new Error("Failed to extend time");

      alert(`Time extended by ${minutes} minutes`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to extend time");
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    const reason = prompt("Reason for stopping exam (required):");
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    if (!confirm("Are you sure you want to stop this exam session? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/examinations/attempts/${attempt.id}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error("Failed to stop session");

      alert("Exam session stopped");
      router.push("/principal/examinations?tab=live");
    } catch (error) {
      console.error(error);
      alert("Failed to stop exam session");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (attempt.status) {
      case "IN_PROGRESS":
        return <span className="badge badge-danger">🔴 IN PROGRESS</span>;
      case "SUBMITTED":
        return <span className="badge badge-success">✅ SUBMITTED</span>;
      case "SCORED":
        return <span className="badge badge-info">📊 SCORED</span>;
      default:
        return <span className="badge badge-secondary">{attempt.status}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/principal/examinations?tab=live" className="hover:text-primary">
            Live Monitoring
          </Link>
          <span>/</span>
          <span>Monitor Attempt</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{attempt.user.name}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-gray-500">{attempt.exam.title}</p>
            <p className="text-xs text-gray-400">
              {attempt.exam.course.courseCode} - {attempt.exam.course.title}
            </p>
          </div>

          {isInProgress && canControl && (
            <div className="flex gap-2">
              <button
                onClick={handleExtendTime}
                disabled={loading}
                className="btn-primary"
                title="Extend time limit (emergency)"
              >
                ⏱️ Extend Time
              </button>
              <button
                onClick={handleStopSession}
                disabled={loading}
                className="btn-danger"
                title="Stop exam session (emergency)"
              >
                🛑 Stop Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Student Number</p>
          <p className="text-lg font-mono font-bold">{attempt.user.studentNumber || "-"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Attempt Number</p>
          <p className="text-2xl font-bold">#{attempt.number}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Current Question</p>
          <p className="text-2xl font-bold">Q{attempt.currentQuestionIndex + 1}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Tab Switches</p>
          <p className={`text-2xl font-bold ${attempt.tabSwitches > 0 ? "text-warning" : ""}`}>
            {attempt.tabSwitches > 0 ? `⚠️ ${attempt.tabSwitches}` : "0"}
          </p>
        </div>
      </div>

      {/* Time Remaining Card */}
      {isInProgress && timeRemaining !== null && (
        <div className="card mb-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                Time Remaining
              </p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                {formatTime(timeRemaining)}
              </p>
            </div>
            {timeRemaining < 300 && (
              <div className="text-4xl animate-pulse">⏰</div>
            )}
          </div>
          {timeRemaining < 60 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              ⚠️ Less than 1 minute remaining!
            </p>
          )}
        </div>
      )}

      {/* Exam Details */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Exam Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Title:</span>
              <span className="font-medium">{attempt.exam.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time Limit:</span>
              <span className="font-medium">
                {attempt.exam.timeLimitMin ? `${attempt.exam.timeLimitMin} min` : "No limit"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Per Question:</span>
              <span className="font-medium">
                {attempt.exam.perQuestionSec ? `${attempt.exam.perQuestionSec}s` : "No limit"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pass Mark:</span>
              <span className="font-medium">{attempt.exam.passPercent}%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Attempt Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Started At:</span>
              <span className="font-medium">
                {new Date(attempt.startedAt).toLocaleString("en-UG")}
              </span>
            </div>
            {attempt.timeLimitEndsAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ends At:</span>
                <span className="font-medium">
                  {new Date(attempt.timeLimitEndsAt).toLocaleString("en-UG")}
                </span>
              </div>
            )}
            {attempt.submittedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted At:</span>
                <span className="font-medium">
                  {new Date(attempt.submittedAt).toLocaleString("en-UG")}
                </span>
              </div>
            )}
            {attempt.score !== null && attempt.maxScore !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Score:</span>
                <span className="font-medium">
                  {attempt.score} / {attempt.maxScore} (
                  {Math.round((attempt.score / attempt.maxScore) * 100)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switches Alert */}
      {attempt.tabSwitches > 0 && (
        <div className="card bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-300">
                Tab Switch Violations Detected
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Student switched tabs {attempt.tabSwitches} time{attempt.tabSwitches !== 1 ? "s" : ""}{" "}
                during this exam. This may indicate potential academic integrity issues.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student Information */}
      <div className="card">
        <h2 className="font-semibold mb-4">Student Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name:</span>
            <span className="font-medium">{attempt.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email:</span>
            <span className="font-medium">{attempt.user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Student Number:</span>
            <span className="font-mono font-medium">{attempt.user.studentNumber || "-"}</span>
          </div>
        </div>
      </div>

      {/* Emergency Controls Note */}
      {isInProgress && canControl && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <p className="font-medium mb-2">📘 Emergency Controls:</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
            <li><strong>Extend Time:</strong> Add extra minutes in case of technical issues or special circumstances</li>
            <li><strong>Stop Session:</strong> Immediately terminate the exam session (cannot be undone)</li>
            <li>All emergency actions are audited and require a reason</li>
          </ul>
        </div>
      )}
    </div>
  );
}
