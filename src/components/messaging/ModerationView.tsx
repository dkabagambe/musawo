"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";

interface ModerationConversation {
  id: string;
  broadcastLabel: string | null;
  updatedAt: string;
  participants: Array<{
    user: { id: string; name: string; role: string };
  }>;
  messages: Array<{
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  }>;
}

interface ApiResponse {
  conversations: ModerationConversation[];
  total: number;
  page: number;
  limit: number;
}

export default function ModerationView() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/moderation?page=${p}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  if (loading && !data) {
    return <p className="text-sm text-gray-400">Loading conversations...</p>;
  }

  if (!data || data.conversations.length === 0) {
    return <p className="text-sm text-gray-400">No direct conversations found.</p>;
  }

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">{data.total} total conversations</p>
      {data.conversations.map((c) => {
        const isOpen = expanded === c.id;
        const names = c.participants.map((p) => p.user.name).join(", ");

        return (
          <div key={c.id} className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/50 transition-colors"
              onClick={() => setExpanded(isOpen ? null : c.id)}
              aria-expanded={isOpen}
            >
              <div className="flex -space-x-2 flex-shrink-0">
                {c.participants.slice(0, 2).map((p) => (
                  <AvatarOrInitials key={p.user.id} name={p.user.name} size={28} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.broadcastLabel ?? names}</p>
                {c.messages[0] && (
                  <p className="text-xs text-gray-400 truncate">{c.messages[0].body.slice(0, 80)}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-xs text-gray-400">
                {new Date(c.updatedAt).toLocaleDateString("en-UG")}
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-border bg-surface/30 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  Participants: {names}
                </p>
                {c.messages.length === 0 ? (
                  <p className="text-xs text-gray-400">No messages yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {c.messages.map((m) => {
                      const sender = c.participants.find((p) => p.user.id === m.senderId)?.user;
                      return (
                        <div key={m.id} className="flex gap-2 text-sm">
                          <span className="font-semibold text-primary flex-shrink-0 min-w-[6rem]">
                            {sender?.name ?? "Unknown"}:
                          </span>
                          <span className="text-gray-700 break-words">{m.body}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                            {new Date(m.createdAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
            className="btn-ghost text-sm px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 self-center">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => load(page + 1)}
            disabled={page >= totalPages || loading}
            className="btn-ghost text-sm px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
