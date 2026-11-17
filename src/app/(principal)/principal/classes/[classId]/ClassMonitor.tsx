"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  liveClass: any;
  stats: {
    totalStudents: number;
    admittedCount: number;
    onlineCount: number;
    markedPresentCount: number;
    rollCallProgress: number;
  };
  userId: string;
  canObserve: boolean;
};

export default function ClassMonitor({ liveClass, stats, userId, canObserve }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "groups" | "recording">(
    "overview"
  );

  const isLive = liveClass.status === "LIVE";
  const isCompleted = liveClass.status === "COMPLETED";
  const isScheduled = liveClass.status === "SCHEDULED";

  const handleJoinAsObserver = async () => {
    if (!liveClass.joinUrl) {
      alert("No meeting link available for this class");
      return;
    }

    setLoading(true);
    try {
      // Log the observer join action
      const response = await fetch("/api/principal/classes/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: liveClass.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to log observer join");

      // Open meeting in new tab
      window.open(liveClass.joinUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Failed to join as observer");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          LIVE
        </span>
      );
    } else if (isCompleted) {
      return <span className="badge badge-secondary">Completed</span>;
    } else if (isScheduled) {
      return <span className="badge badge-info">Scheduled</span>;
    } else {
      return <span className="badge badge-secondary">{liveClass.status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/principal/classes" className="hover:text-primary">
            Classes
          </Link>
          <span>/</span>
          <span>Monitor</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{liveClass.title}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-gray-500">
              {liveClass.course.title} ({liveClass.course.courseCode})
            </p>
            <p className="text-sm text-gray-400">
              {new Date(liveClass.scheduledAt).toLocaleString("en-UG", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {isLive && canObserve && liveClass.joinUrl && (
            <button
              onClick={handleJoinAsObserver}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <span>👁️</span>
              {loading ? "Joining..." : "Join as Observer"}
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Students</p>
          <p className="text-2xl font-bold">{stats.totalStudents}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Admitted</p>
          <p className="text-2xl font-bold text-green-600">{stats.admittedCount}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Currently Online</p>
          <p className="text-2xl font-bold text-blue-600">{stats.onlineCount}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Roll Call</p>
          <p className="text-2xl font-bold">
            {stats.markedPresentCount}/{stats.totalStudents}
          </p>
          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${stats.rollCallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {[
          { value: "overview", label: "Overview" },
          { value: "attendance", label: "Attendance" },
          { value: "groups", label: "Breakaway Groups" },
          { value: "recording", label: "Recording" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Instructor Info */}
          <div className="card">
            <h2 className="font-semibold mb-4">Instructor</h2>
            <div className="flex items-center gap-3">
              {liveClass.tutor.avatarUrl ? (
                <img
                  src={liveClass.tutor.avatarUrl}
                  alt={liveClass.tutor.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-semibold">
                  {liveClass.tutor.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium">{liveClass.tutor.name}</p>
                <p className="text-xs text-gray-400">{liveClass.tutor.email}</p>
              </div>
            </div>
          </div>

          {/* Class Details */}
          <div className="card">
            <h2 className="font-semibold mb-4">Class Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="font-medium">{liveClass.durationMin} minutes</span>
              </div>
              {liveClass.venue && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Venue:</span>
                  <span className="font-medium">{liveClass.venue}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium">{liveClass.status}</span>
              </div>
            </div>
          </div>

          {/* Recording Status */}
          {isLive && (
            <div className="card md:col-span-2">
              <h2 className="font-semibold mb-4">Recording Status</h2>
              <div className="flex items-center gap-3">
                {liveClass.recordingUrl ? (
                  <>
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-red-600">Recording in progress</span>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                    <span className="text-sm text-gray-500">Not recording</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Past class recording */}
          {isCompleted && liveClass.recordingUrl && (
            <div className="card md:col-span-2">
              <h2 className="font-semibold mb-4">Class Recording</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎥</span>
                  <div>
                    <p className="font-medium text-sm">Recording Available</p>
                    <p className="text-xs text-gray-400">
                      Recorded on {new Date(liveClass.scheduledAt).toLocaleDateString("en-UG")}
                    </p>
                  </div>
                </div>
                <a
                  href={liveClass.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm"
                >
                  View Recording
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Student Attendance</h2>
          {liveClass.attendance.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">
              No students registered for this class
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Student No.</th>
                    <th className="pb-2 font-medium pr-4">Admitted</th>
                    <th className="pb-2 font-medium pr-4">Online</th>
                    <th className="pb-2 font-medium">Roll Call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liveClass.attendance.map((a: any) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {a.user.avatarUrl ? (
                            <img
                              src={a.user.avatarUrl}
                              alt={a.user.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold">
                              {a.user.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium">{a.user.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                        {a.user.studentNumber || "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {a.admittedAt ? (
                          <span className="badge badge-success text-xs">
                            {new Date(a.admittedAt).toLocaleTimeString("en-UG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {a.joinedAt && !a.leftAt ? (
                          <span className="badge badge-success text-xs">Online</span>
                        ) : a.leftAt ? (
                          <span className="badge badge-secondary text-xs">Left</span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2">
                        {a.markedPresent ? (
                          <span className="badge badge-success text-xs">Present</span>
                        ) : (
                          <span className="badge badge-secondary text-xs">Not marked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "groups" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Breakaway Groups</h2>
          {!liveClass.groups || liveClass.groups.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">
              No breakaway groups configured for this class
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveClass.groups.map((group: any) => (
                <div key={group.id} className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">{group.name}</h3>
                  <div className="space-y-2">
                    {group.members.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2">
                        {m.user.avatarUrl ? (
                          <img
                            src={m.user.avatarUrl}
                            alt={m.user.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                            {m.user.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm">{m.user.name}</span>
                      </div>
                    ))}
                  </div>
                  {group.members.length === 0 && (
                    <p className="text-xs text-gray-400">No members assigned</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "recording" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Recording</h2>
          {isCompleted && liveClass.recordingUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🎥</span>
                <div>
                  <p className="font-medium">Class Recording Available</p>
                  <p className="text-sm text-gray-500">
                    Recorded on {new Date(liveClass.scheduledAt).toLocaleDateString("en-UG")}
                  </p>
                </div>
              </div>
              <a
                href={liveClass.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Open Recording
              </a>
            </div>
          ) : isLive ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="font-medium text-red-600">
                  {liveClass.recordingUrl ? "Recording in progress" : "Class is live"}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {liveClass.recordingUrl
                  ? "Recording will be available after the class ends"
                  : "Recording status will update when available"}
              </p>
            </div>
          ) : (
            <p className="text-center py-12 text-gray-400 text-sm">
              No recording available for this class
            </p>
          )}
        </div>
      )}
    </div>
  );
}
