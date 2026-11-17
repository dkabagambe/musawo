"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Thread = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    role: string;
  };
  course: {
    id: string;
    title: string;
    courseCode: string;
  };
  _count: {
    replies: number;
  };
};

type Props = {
  threads: Thread[];
  courses: { id: string; title: string; courseCode: string }[];
  selectedCourseId: string | null;
  searchQuery: string;
  filter: string;
  pinnedCount: number;
  lockedCount: number;
  canModerate: boolean;
  userId: string;
};

export default function ForumModerationView({
  threads,
  courses,
  selectedCourseId,
  searchQuery,
  filter,
  pinnedCount,
  lockedCount,
  canModerate,
  userId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchQuery);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (selectedCourseId && key !== "courseId") params.set("courseId", selectedCourseId);
    if (search && key !== "search") params.set("search", search);
    if (filter !== "all" && key !== "filter") params.set("filter", filter);
    
    if (value) params.set(key, value);
    
    router.push(`/principal/forum?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", search);
  };

  const handlePin = async (threadId: string, pin: boolean) => {
    if (!canModerate) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/forum/threads/${threadId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: pin }),
      });

      if (!response.ok) throw new Error("Failed to update thread");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update thread");
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async (threadId: string, lock: boolean) => {
    if (!canModerate) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/forum/threads/${threadId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: lock }),
      });

      if (!response.ok) throw new Error("Failed to update thread");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update thread");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (threadId: string, replyId: string) => {
    if (!canModerate) return;

    const reason = prompt("Reason for deleting this post (required):");
    
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    if (!confirm("Delete this post? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/principal/forum/replies/${replyId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error("Failed to delete post");

      alert("Post deleted successfully");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discussion Forum Moderation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read any forum thread across all courses and moderate discussions
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="space-y-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search threads by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  handleFilterChange("search", "");
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
          </form>

          {/* Filter row */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Course</label>
              <select
                value={selectedCourseId || ""}
                onChange={(e) => handleFilterChange("courseId", e.target.value)}
                className="input text-sm"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter</label>
              <select
                value={filter}
                onChange={(e) => handleFilterChange("filter", e.target.value)}
                className="input text-sm"
              >
                <option value="all">All Threads ({threads.length})</option>
                <option value="pinned">Pinned ({pinnedCount})</option>
                <option value="locked">Locked ({lockedCount})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {threads.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">💬</p>
          <p className="text-gray-500 text-sm">
            {search
              ? `No threads found for "${search}"`
              : filter !== "all"
              ? `No ${filter} threads`
              : "No discussion threads yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div key={thread.id} className="card">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges and Title */}
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    {thread.pinned && (
                      <span className="badge badge-info text-xs flex-shrink-0">📌 Pinned</span>
                    )}
                    {thread.locked && (
                      <span className="badge badge-warning text-xs flex-shrink-0">🔒 Locked</span>
                    )}
                    <h2 className="font-semibold text-base">{thread.title}</h2>
                  </div>

                  {/* Body preview */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {thread.body}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>
                      {thread.author.name} ({thread.author.role.replace(/_/g, " ")})
                    </span>
                    <span>•</span>
                    <span>{thread.course.courseCode}</span>
                    <span>•</span>
                    <span>{thread._count.replies} {thread._count.replies === 1 ? "reply" : "replies"}</span>
                    <span>•</span>
                    <span>{new Date(thread.createdAt).toLocaleDateString("en-UG")}</span>
                  </div>
                </div>

                {/* Actions */}
                {canModerate && (
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Link
                      href={`/principal/forum/${thread.id}`}
                      className="btn-secondary text-xs px-2 py-1 no-underline"
                    >
                      View Thread
                    </Link>
                    
                    <button
                      onClick={() => handlePin(thread.id, !thread.pinned)}
                      disabled={loading}
                      className="btn-secondary text-xs px-2 py-1"
                      title={thread.pinned ? "Unpin" : "Pin"}
                    >
                      {thread.pinned ? "📌 Unpin" : "📌 Pin"}
                    </button>

                    <button
                      onClick={() => handleLock(thread.id, !thread.locked)}
                      disabled={loading}
                      className="btn-secondary text-xs px-2 py-1"
                      title={thread.locked ? "Unlock" : "Lock"}
                    >
                      {thread.locked ? "🔓 Unlock" : "🔒 Lock"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info notice */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          🛡️ Moderation Actions
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
          <li><strong>Pin</strong>: Keep important threads at the top of the list</li>
          <li><strong>Lock</strong>: Prevent new replies (thread remains visible)</li>
          <li><strong>Delete posts</strong>: Remove inappropriate replies (requires reason, audit logged)</li>
          <li>All moderation actions are audit logged with timestamp and moderator</li>
        </ul>
      </div>
    </div>
  );
}
