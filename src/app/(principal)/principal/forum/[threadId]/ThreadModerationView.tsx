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
    email: string;
  };
  course: {
    id: string;
    title: string;
    courseCode: string;
  };
  replies: {
    id: string;
    body: string;
    deletedAt: Date | null;
    createdAt: Date;
    author: {
      id: string;
      name: string;
      role: string;
    };
  }[];
};

type Props = {
  thread: Thread;
  canModerate: boolean;
  userId: string;
};

export default function ThreadModerationView({ thread, canModerate, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePin = async (pin: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/principal/forum/threads/${thread.id}/pin`, {
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

  const handleLock = async (lock: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/principal/forum/threads/${thread.id}/lock`, {
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

  const handleDeleteReply = async (replyId: string) => {
    const reason = prompt("Reason for deleting this post (required):");
    
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    if (!confirm("Delete this post? This action marks it as deleted (soft delete).")) {
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

  const activeReplies = thread.replies.filter((r) => !r.deletedAt);
  const deletedReplies = thread.replies.filter((r) => r.deletedAt);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/principal/forum"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Forum
      </Link>

      {/* Thread header card */}
      <div className="card mb-6">
        {/* Course and badges */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-secondary text-xs">{thread.course.courseCode}</span>
            {thread.pinned && (
              <span className="badge badge-info text-xs">📌 Pinned</span>
            )}
            {thread.locked && (
              <span className="badge badge-warning text-xs">🔒 Locked</span>
            )}
          </div>

          {/* Moderation actions */}
          {canModerate && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePin(!thread.pinned)}
                disabled={loading}
                className="btn-secondary text-xs px-2 py-1"
              >
                {thread.pinned ? "Unpin" : "Pin Thread"}
              </button>

              <button
                onClick={() => handleLock(!thread.locked)}
                disabled={loading}
                className="btn-secondary text-xs px-2 py-1"
              >
                {thread.locked ? "Unlock" : "Lock Thread"}
              </button>
            </div>
          )}
        </div>

        {/* Title and body */}
        <h1 className="text-2xl font-bold mb-3">{thread.title}</h1>
        <p className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
          {thread.body}
        </p>

        {/* Author info */}
        <div className="flex items-center gap-3 text-sm text-gray-500 pt-3 border-t border-border">
          <span className="font-medium">{thread.author.name}</span>
          <span>•</span>
          <span>{thread.author.role.replace(/_/g, " ")}</span>
          <span>•</span>
          <span>{new Date(thread.createdAt).toLocaleDateString("en-UG", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>
      </div>

      {/* Replies header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          Replies ({activeReplies.length})
        </h2>
        {deletedReplies.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {deletedReplies.length} deleted {deletedReplies.length === 1 ? "post" : "posts"} (hidden from students)
          </p>
        )}
      </div>

      {/* Replies list */}
      {activeReplies.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-sm">No replies yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeReplies.map((reply) => (
            <div key={reply.id} className="card">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
                {reply.body}
              </p>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-medium">{reply.author.name}</span>
                  <span>•</span>
                  <span>{reply.author.role.replace(/_/g, " ")}</span>
                  <span>•</span>
                  <span>{new Date(reply.createdAt).toLocaleDateString("en-UG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>

                {/* Delete button */}
                {canModerate && (
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    disabled={loading}
                    className="btn-danger text-xs px-2 py-1"
                    title="Delete post (requires reason)"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deleted replies (only visible to moderator) */}
      {canModerate && deletedReplies.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
            Deleted Posts ({deletedReplies.length}) - Only Visible to Moderators
          </h3>
          <div className="space-y-3">
            {deletedReplies.map((reply) => (
              <div key={reply.id} className="card bg-red-50 dark:bg-red-950 opacity-60">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-red-600 dark:text-red-400">🗑️</span>
                  <span className="badge badge-danger text-xs">Deleted</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-through mb-3">
                  {reply.body}
                </p>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">{reply.author.name}</span>
                  <span> • </span>
                  <span>Deleted {new Date(reply.deletedAt!).toLocaleDateString("en-UG")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation notice */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          🛡️ Moderation Actions
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
          <li><strong>Pin</strong>: Keep this thread at the top of the forum list</li>
          <li><strong>Lock</strong>: Prevent new replies (thread remains visible to all)</li>
          <li><strong>Delete Reply</strong>: Soft-delete inappropriate posts (requires reason)</li>
          <li>Deleted posts are hidden from students but visible to you for audit purposes</li>
          <li>All moderation actions are audit logged</li>
        </ul>
      </div>
    </div>
  );
}
