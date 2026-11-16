"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "GENERAL",    label: "General" },
  { value: "ACADEMIC",   label: "Academic" },
  { value: "TECHNICAL",  label: "Technical" },
  { value: "ENROLMENT",  label: "Enrolment" },
  { value: "OTHER",      label: "Other" },
];

export default function NewTicketForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Attachment must be under 5 MB.");
      return;
    }
    setError("");
    setAttachment(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          category,
        }),
      });
      const data = await res.json() as { error?: string; id?: string; uploadUrl?: string; s3Key?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create ticket."); return; }

      // Upload attachment if provided and API returned an upload URL
      if (attachment && data.uploadUrl) {
        try {
          await fetch(data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": attachment.type || "application/octet-stream" },
            body: attachment,
          });
        } catch {
          // Non-fatal: ticket was created
        }
      }

      setSubject("");
      setBody("");
      setCategory("GENERAL");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Open a support ticket
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-lg font-semibold">New support ticket</h2>
      {error && <p className="text-danger text-sm bg-danger/10 rounded-xl p-3">{error}</p>}

      {/* Category */}
      <div>
        <label htmlFor="ticket-category" className="label">Category *</label>
        <select
          id="ticket-category"
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="ticket-subject" className="label">Subject *</label>
        <input
          id="ticket-subject"
          type="text"
          className="input"
          placeholder="Briefly describe your issue"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="ticket-body" className="label">Details *</label>
        <textarea
          id="ticket-body"
          className="input min-h-[120px] resize-y"
          placeholder="Describe the issue in detail - include your course, what you were doing, and any error messages."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={3000}
        />
      </div>

      {/* Attachment */}
      <div>
        <label className="label">Attachment (optional, up to 5 MB)</label>
        {attachment ? (
          <div className="flex items-center gap-2 p-3 bg-surface rounded-xl border border-border">
            <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{attachment.name}</span>
            <button
              type="button"
              onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-danger hover:text-danger/70"
              aria-label="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-3 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Attach a file (screenshot, document)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Submitting...</> : "Submit ticket"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
