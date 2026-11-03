"use client";

/**
 * GroupWorkSubmitCard - students submit group work for a live class.
 * Visible only if the student is in a group for this class.
 */

import React, { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";

interface IndividualMark {
  userId: string;
  mark: number;
  note?: string;
}

interface Submission {
  id: string;
  title: string;
  body?: string | null;
  groupMark: number | null;
  gradedAt: string | null;
  individualMarks?: IndividualMark[] | null;
}

interface Props {
  classId: string;
  userId?: string;
}

export default function GroupWorkSubmitCard({ classId, userId }: Props & { userId?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${classId}/work`)
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data.submissions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [classId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${classId}/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions((prev) => {
          const existing = prev.find((s) => s.id === data.id);
          if (existing) return prev.map((s) => (s.id === data.id ? data : s));
          return [...prev, data];
        });
        setMsg("Group work submitted.");
        setShowForm(false);
        setForm({ title: "", body: "" });
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  // Only show if API returned submissions array (means they are in a group)
  // We show regardless; if no group the submit returns 403

  const existing = submissions[0];

  return (
    <div className="border border-border rounded-2xl bg-white p-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="w-4 h-4 text-accent" />
        <span className="font-semibold text-sm text-primary">Group Work</span>
        {existing?.groupMark !== null && existing?.groupMark !== undefined && (() => {
          const myMark = userId ? existing.individualMarks?.find((im) => im.userId === userId) : null;
          const displayMark = myMark ?? null;
          return (
            <span className="ml-auto flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                Group mark: {existing.groupMark}/100
              </span>
              {displayMark && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Your mark: {displayMark.mark}/100
                  {displayMark.note && <span className="font-normal ml-1 text-gray-500">{displayMark.note}</span>}
                </span>
              )}
            </span>
          );
        })()}
      </div>

      {msg && <p className="text-sm text-accent font-medium mb-2">{msg}</p>}

      {existing ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{existing.title}</p>
          {existing.body && <p className="text-xs text-gray-600">{existing.body}</p>}
          <p className="text-xs text-gray-400">
            {existing.gradedAt ? "Graded" : "Submitted - awaiting grade"}
          </p>
          <button
            type="button"
            className="text-xs text-accent underline mt-1"
            onClick={() => { setForm({ title: existing.title, body: existing.body ?? "" }); setShowForm(true); }}
          >
            Edit submission
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "Submit group work"}
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div>
            <label className="label" htmlFor="gwtitle">Title</label>
            <input
              id="gwtitle"
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Group report title"
            />
          </div>
          <div>
            <label className="label" htmlFor="gwbody">Description / notes</label>
            <textarea
              id="gwbody"
              className="input"
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Optional details about your group work..."
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
