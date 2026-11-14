"use client";

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { X, Send, ArrowLeft, Search, MessageSquare } from "lucide-react";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConversationUser {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  studentNumber?: string | null;
}

interface ConversationSummary {
  id: string;
  broadcastLabel?: string | null;
  updatedAt: string;
  otherUser: ConversationUser | null;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unread: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string; avatarUrl?: string | null };
}

interface ConversationPanelProps {
  /** Current user's id */
  currentUserId: string;
  /** If set, automatically opens or creates conversation with this user on mount */
  openWithUser?: ConversationUser | null;
  /** Whether to show as full page (true) or embedded panel (false) */
  fullPage?: boolean;
  /** Called when the panel should close (mobile drawer mode) */
  onClose?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-UG", { weekday: "short" });
  return d.toLocaleDateString("en-UG", { day: "numeric", month: "short" });
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
}

// Unescape HTML-encoded characters for display
function unescape(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ConversationPanel({
  currentUserId,
  openWithUser,
  fullPage = false,
  onClose,
}: ConversationPanelProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [inputBody, setInputBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async (q?: string) => {
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/conversations${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // silent
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  // ── Load messages for active conversation ──────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setOptimisticMsgs([]);
      // Update unread in conversation list
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c)),
      );
    } catch {
      // silent
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // ── On mount: load conversations, then open the requested one ──────────
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Open conversation with pre-specified user ──────────────────────────
  useEffect(() => {
    if (!openWithUser) return;
    // Find or create conversation
    async function openOrCreate() {
      const existing = conversations.find(
        (c) => c.otherUser?.id === openWithUser!.id,
      );
      if (existing) {
        setActiveId(existing.id);
        return;
      }
      // Create
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: openWithUser!.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveId(data.conversationId);
        await loadConversations();
      }
    }
    openOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWithUser]);

  // ── When activeId changes: load messages + start polling ──────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeId) return;

    loadMessages(activeId);

    pollRef.current = setInterval(() => {
      loadMessages(activeId);
      loadConversations(search || undefined);
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, loadMessages, loadConversations, search]);

  // ── Scroll to bottom on new messages ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optimisticMsgs]);

  // ── Search with debounce ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => loadConversations(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, loadConversations]);

  // ── Send message ───────────────────────────────────────────────────────
  async function sendMessage() {
    if (!activeId || !inputBody.trim() || sending) return;
    setSendError("");
    const body = inputBody.trim();
    setInputBody("");

    // Optimistic message
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: activeId,
      senderId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: "You", role: "", avatarUrl: null },
    };
    setOptimisticMsgs((prev) => [...prev, optimistic]);

    try {
      setSending(true);
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error ?? "Failed to send message. Tap to retry.");
        setOptimisticMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInputBody(body); // restore
        return;
      }
      // Reload messages to get the confirmed version
      await loadMessages(activeId);
    } catch {
      setSendError("Network error. Please try again.");
      setOptimisticMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInputBody(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── All messages (confirmed + optimistic) ─────────────────────────────
  const allMessages = [...messages, ...optimisticMsgs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null;
  const filteredConvos = conversations.filter((c) =>
    !search || c.otherUser?.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  const isDesktop = fullPage;

  return (
    <div
      className={`flex h-full overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm ${
        fullPage ? "min-h-[600px]" : ""
      }`}
    >
      {/* ── Conversation list (left panel) ── */}
      <aside
        className={`flex flex-col border-r border-border bg-surface ${
          isDesktop
            ? "w-80 flex-shrink-0"
            : activeId
            ? "hidden"
            : "flex-1"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-primary">Messages</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="Close messages"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="input pl-8 py-1.5 text-sm h-8"
              aria-label="Search conversations"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 p-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">
                {search ? "No conversations match your search." : "No conversations yet."}
              </p>
            </div>
          ) : (
            filteredConvos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-primary/5 transition-colors border-b border-border/50 ${
                  activeId === c.id ? "bg-primary/10" : ""
                }`}
                aria-selected={activeId === c.id}
              >
                <div className="relative flex-shrink-0">
                  <AvatarOrInitials
                    name={c.otherUser?.name ?? "?"}
                    avatarUrl={c.otherUser?.avatarUrl}
                    size={40}
                  />
                  {c.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-white" aria-label="Unread" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm font-medium truncate ${c.unread > 0 ? "text-primary font-semibold" : ""}`}>
                      {c.broadcastLabel ?? c.otherUser?.name ?? "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {c.lastMessage ? formatTime(c.lastMessage.createdAt) : ""}
                    </span>
                  </div>
                  {c.lastMessage && (
                    <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                      {c.lastMessage.senderId === currentUserId ? "You: " : ""}
                      {unescape(c.lastMessage.body)}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Message thread (right panel) ── */}
      <section
        className={`flex flex-col flex-1 min-w-0 ${
          !isDesktop && !activeId ? "hidden" : "flex"
        }`}
      >
        {!activeId ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-6 text-gray-400">
            <MessageSquare className="w-14 h-14 mb-3 text-gray-200" />
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
              {/* Back button for mobile */}
              {!isDesktop && (
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="text-gray-400 hover:text-primary mr-1"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {activeConvo?.otherUser && (
                <AvatarOrInitials
                  name={activeConvo.otherUser.name}
                  avatarUrl={activeConvo.otherUser.avatarUrl}
                  size={36}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary text-sm truncate">
                  {activeConvo?.broadcastLabel ?? activeConvo?.otherUser?.name ?? "Conversation"}
                </p>
                {activeConvo?.otherUser?.studentNumber && (
                  <p className="text-xs text-gray-400">{activeConvo.otherUser.studentNumber}</p>
                )}
              </div>
              {onClose && isDesktop && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite" aria-label="Messages">
              {loadingMsgs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${i % 2 === 0 ? "justify-end" : ""}`}
                    >
                      <div className="animate-pulse h-10 bg-gray-100 rounded-xl w-48" />
                    </div>
                  ))}
                </div>
              ) : allMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-8">No messages yet. Send the first one.</p>
              ) : (
                allMessages.map((m, idx) => {
                  const isMine = m.senderId === currentUserId;
                  const isOptimistic = m.id.startsWith("opt-");
                  // Show sender name when not mine and name changes
                  const prevMsg = idx > 0 ? allMessages[idx - 1] : null;
                  const showSender = !isMine && (!prevMsg || prevMsg.senderId !== m.senderId);

                  return (
                    <div key={m.id} className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && showSender && (
                        <div className="flex-shrink-0 self-end">
                          <AvatarOrInitials name={m.sender.name} avatarUrl={m.sender.avatarUrl} size={28} />
                        </div>
                      )}
                      {!isMine && !showSender && <div className="w-7 flex-shrink-0" />}
                      <div className={`max-w-[75%] ${isMine ? "" : ""}`}>
                        {showSender && !isMine && (
                          <p className="text-xs text-gray-500 mb-0.5 ml-1">{m.sender.name}</p>
                        )}
                        <div
                          className={`px-3 py-2 rounded-2xl text-sm break-words ${
                            isMine
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                          } ${isOptimistic ? "opacity-70" : ""}`}
                        >
                          {unescape(m.body)}
                        </div>
                        <p className={`text-xs text-gray-400 mt-0.5 ${isMine ? "text-right" : "text-left ml-1"}`}>
                          {formatMessageTime(m.createdAt)}
                          {isOptimistic && " ..."}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send error */}
            {sendError && (
              <div className="px-4 py-1">
                <p className="text-xs text-danger">{sendError}</p>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border px-3 py-3 flex gap-2 items-end flex-shrink-0">
              <textarea
                ref={inputRef}
                value={inputBody}
                onChange={(e) => setInputBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                rows={1}
                maxLength={2000}
                className="input resize-none flex-1 py-2 min-h-[40px] max-h-32"
                aria-label="Message input"
                disabled={sending}
                style={{ lineHeight: "1.4" }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!inputBody.trim() || sending}
                className="btn-primary h-10 w-10 flex items-center justify-center rounded-full flex-shrink-0 p-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
