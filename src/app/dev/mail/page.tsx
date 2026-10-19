"use client";

import { useState, useEffect, useCallback } from "react";
import { notFound } from "next/navigation";
import { RefreshCw, Trash2, Mail, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface DevEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
}

// Only render on client - server can't notFound() in client component
// We guard via the API returning 404 in production.

export default function DevMailPage() {
  const [emails, setEmails]     = useState<DevEmail[]>([]);
  const [selected, setSelected] = useState<DevEmail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [isProd, setIsProd]     = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/mail");
      if (res.status === 404) { setIsProd(true); return; }
      const data = await res.json() as { emails: DevEmail[] };
      setEmails(data.emails ?? []);
      if (!selected && data.emails.length > 0) setSelected(data.emails[0]);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { void fetchEmails(); }, [fetchEmails]);

  // Auto-refresh every 5 s
  useEffect(() => {
    const t = setInterval(() => { void fetchEmails(); }, 5000);
    return () => clearInterval(t);
  }, [fetchEmails]);

  async function clearAll() {
    await fetch("/api/dev/mail", { method: "DELETE" });
    setEmails([]);
    setSelected(null);
  }

  if (isProd) {
    notFound();
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white h-14 flex items-center px-5 gap-3 shadow flex-shrink-0">
        <Link href="/dev/login" className="flex items-center gap-2 no-underline">
          <Image src="/assets/logo-header.png" alt="MTC" width={28} height={28} className="rounded-lg bg-white/20 p-0.5" />
          <span className="font-bold text-sm">Dev Tools</span>
        </Link>
        <span className="text-white/40 text-xs">/</span>
        <span className="text-white/80 text-sm flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Email preview
        </span>
        <div className="flex-1" />
        <span className="text-white/50 text-xs bg-white/10 px-2 py-1 rounded">dev only</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - email list */}
        <aside className="w-72 bg-white border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <span className="text-sm font-semibold text-primary flex-1">
              Inbox <span className="text-gray-400 font-normal">({emails.length})</span>
            </span>
            <button
              onClick={() => void fetchEmails()}
              className="p-1.5 rounded-lg hover:bg-surface text-gray-400 hover:text-primary transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {emails.length > 0 && (
              <button
                onClick={() => void clearAll()}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-gray-400 hover:text-danger transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {emails.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-400 text-sm">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No emails yet.
                <br />
                <span className="text-xs">Emails appear here when sent in dev mode.</span>
              </div>
            )}
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelected(email)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-surface transition-colors flex items-start gap-2 ${
                  selected?.id === email.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{email.to}</p>
                  <p className="text-sm font-medium text-primary truncate">{email.subject}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(email.sentAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </aside>

        {/* Main - email preview */}
        <main className="flex-1 overflow-auto bg-white">
          {selected ? (
            <div className="h-full flex flex-col">
              {/* Email header */}
              <div className="px-6 py-4 border-b border-border bg-surface flex-shrink-0">
                <h2 className="font-bold text-primary text-base">{selected.subject}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="font-medium">To:</span> {selected.to}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selected.sentAt).toLocaleString("en-UG")}
                </p>
              </div>
              {/* HTML preview */}
              <div className="flex-1 overflow-auto">
                <iframe
                  srcDoc={selected.html}
                  className="w-full h-full min-h-[600px] border-0"
                  title={selected.subject}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-3">
              <Mail className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select an email to preview</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
